"""
LangGraph ReAct agent with Cerebras.
Supports onboarding mode and coaching mode routing.
"""
import os
import json
import logging
from typing import Literal

from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from sqlalchemy.orm import Session

from agents.state import AgentState
from agents.prompts import (
    ONBOARDING_SYSTEM_PROMPT,
    COACHING_SYSTEM_PROMPT,
    ONBOARDING_QUESTIONS,
)
from tools.bias_tools import TOOLS_SCHEMA, TOOL_MAP

logger = logging.getLogger(__name__)

# Lazy-init Cerebras client
_cerebras_client = None


def _get_client():
    global _cerebras_client
    if _cerebras_client is None:
        from cerebras.cloud.sdk import Cerebras
        _cerebras_client = Cerebras(api_key=os.environ.get("CEREBRAS_API_KEY"))
    return _cerebras_client


def _build_system_prompt(state: AgentState) -> str:
    if not state.get("onboarding_complete", False):
        profile = state.get("psychological_profile", {})
        questions_asked = profile.get("questions_asked", [])
        next_idx = len(questions_asked)
        next_q = ONBOARDING_QUESTIONS[next_idx] if next_idx < len(ONBOARDING_QUESTIONS) else ""
        return ONBOARDING_SYSTEM_PROMPT.format(
            question_sequence="\n".join(
                f"{i+1}. {q}" for i, q in enumerate(ONBOARDING_QUESTIONS)
            ),
            questions_asked=json.dumps(questions_asked),
            next_question=next_q,
        )
    else:
        profile = state.get("psychological_profile", {})
        return COACHING_SYSTEM_PROMPT.format(
            psychological_profile=json.dumps(profile, indent=2),
            turn_count=state.get("turn_count", 0),
        )


def call_model(state: AgentState) -> AgentState:
    """Call Cerebras LLM with appropriate system prompt."""
    client = _get_client()
    system_prompt = _build_system_prompt(state)

    messages = [{"role": "system", "content": system_prompt}] + list(state["messages"])

    response = client.chat.completions.create(
        model="llama3.1-8b",
        messages=messages,
        tools=TOOLS_SCHEMA,
        tool_choice="auto",
        max_tokens=1024,
    )

    ai_message = response.choices[0].message
    content = ai_message.content or ""
    msg_dict = {"role": "assistant", "content": content}
    
    if hasattr(ai_message, "tool_calls") and ai_message.tool_calls:
        msg_dict["tool_calls"] = [
            {
                "id": tc.id,
                "type": "function",
                "function": {
                    "name": tc.function.name,
                    "arguments": tc.function.arguments,
                },
            }
            for tc in ai_message.tool_calls
        ]
    else:
        # Fallback for models that output pseudo-JSON tool calls inside the content
        import re
        import uuid
        match = re.search(r'(\{[\s\n]*"name"[\s\n]*:[\s\n]*"[^"]+"[\s\n]*,[\s\n]*"arguments"[\s\n]*:.*\})', content, re.DOTALL)
        if match:
            try:
                parsed = json.loads(match.group(1))
                if "name" in parsed and "arguments" in parsed:
                    args = parsed["arguments"]
                    args_str = json.dumps(args) if isinstance(args, dict) else str(args)
                    msg_dict["tool_calls"] = [{
                        "id": f"call_{uuid.uuid4().hex[:8]}",
                        "type": "function",
                        "function": {
                            "name": parsed["name"],
                            "arguments": args_str
                        }
                    }]
                    # Hide the raw tool JSON from the user message
                    msg_dict["content"] = content[:match.start()].strip()
            except Exception:
                pass

    return {
        "messages": [msg_dict],
        "turn_count": state.get("turn_count", 0) + 1,
    }


def call_tools(state: AgentState, db: Session) -> AgentState:
    """Execute any tool calls from the last assistant message."""
    last_msg = state["messages"][-1]
    tool_calls = last_msg.get("tool_calls", [])

    if not tool_calls:
        return state

    tool_results = []
    session_id = state["session_id"]

    for tc in tool_calls:
        fn_name = tc["function"]["name"]
        try:
            args_raw = tc["function"].get("arguments", "{}")
            args = json.loads(args_raw) if args_raw else {}
        except json.JSONDecodeError:
            args = {}

        tool_fn = TOOL_MAP.get(fn_name)
        if tool_fn:
            try:
                # All tools take session_id and db as first args
                if "profile_update" in args:
                    result = tool_fn(session_id, args["profile_update"], db)
                else:
                    result = tool_fn(session_id, db)
            except Exception as e:
                result = f"Tool error: {str(e)}"
        else:
            result = f"Unknown tool: {fn_name}"

        tool_results.append({
            "role": "tool",
            "tool_call_id": tc["id"],
            "content": result,
        })

    # After tool calls, re-fetch onboarding state from DB
    from models.db_models import TradingSession
    session_obj = db.query(TradingSession).filter(TradingSession.id == session_id).first()
    updates = {"messages": tool_results}
    if session_obj:
        updates["onboarding_complete"] = session_obj.onboarding_complete
        updates["psychological_profile"] = session_obj.get_psychological_profile()

    return updates


def should_continue(state: AgentState) -> Literal["call_tools", "end"]:
    last_msg = state["messages"][-1]
    if last_msg.get("tool_calls"):
        return "call_tools"
    return "end"


def build_graph(db: Session):
    """Build and compile the LangGraph graph, injecting db dependency."""

    def _call_tools_with_db(state: AgentState):
        return call_tools(state, db)

    workflow = StateGraph(AgentState)
    workflow.add_node("call_model", call_model)
    workflow.add_node("call_tools", _call_tools_with_db)

    workflow.set_entry_point("call_model")
    workflow.add_conditional_edges(
        "call_model",
        should_continue,
        {
            "call_tools": "call_tools",
            "end": END,
        },
    )
    workflow.add_edge("call_tools", "call_model")

    return workflow.compile()


async def run_agent(
    session_id: str,
    message: str,
    history: list,
    db: Session,
):
    """
    Run the agent for one turn. Returns (response_text, updated_session).
    """
    from models.db_models import TradingSession

    session_obj = db.query(TradingSession).filter(TradingSession.id == session_id).first()
    if not session_obj:
        raise ValueError(f"Session {session_id} not found")

    # Increment turn count
    session_obj.chat_turn_count += 1
    db.commit()

    psych_profile = session_obj.get_psychological_profile()

    initial_state: AgentState = {
        "messages": history + [{"role": "user", "content": message}],
        "session_id": session_id,
        "onboarding_complete": session_obj.onboarding_complete,
        "psychological_profile": psych_profile,
        "turn_count": session_obj.chat_turn_count,
    }

    graph = build_graph(db)
    result = graph.invoke(initial_state)

    # Re-fetch session after graph execution (tools may have updated it)
    db.refresh(session_obj)

    response_text = result["messages"][-1].get("content", "")
    return response_text, session_obj
