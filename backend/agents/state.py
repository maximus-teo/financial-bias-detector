"""LangGraph agent state definition."""
from typing import Annotated, TypedDict
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    session_id: str
    onboarding_complete: bool
    psychological_profile: dict
    turn_count: int
