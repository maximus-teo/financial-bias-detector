"""LangGraph agent state definition."""
import operator
from typing import Annotated, TypedDict


class AgentState(TypedDict):
    messages: Annotated[list, operator.add]
    session_id: str
    onboarding_complete: bool
    psychological_profile: dict
    turn_count: int
