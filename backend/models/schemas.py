from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


# ── Upload ────────────────────────────────────────────────────────────────────

class TradeRecord(BaseModel):
    timestamp: str
    asset: str
    side: str
    quantity: float
    entry_price: float
    exit_price: float
    profit_loss: float
    balance: float


class ManualUploadRequest(BaseModel):
    session_id: Optional[str] = None
    trades: List[TradeRecord]


class UploadResponse(BaseModel):
    session_id: str
    trade_count: int
    filename: Optional[str] = None


# ── Analysis ──────────────────────────────────────────────────────────────────

class SignalDetail(BaseModel):
    label: str
    value: Any
    threshold: Any
    triggered: bool
    timestamp: Optional[str] = None


class BiasResult(BaseModel):
    bias: str
    score: float
    severity: str
    signals: List[SignalDetail]
    summary: str
    recommendations: List[dict]


class RiskProfile(BaseModel):
    score: float
    profile: str
    components: dict


class FullReport(BaseModel):
    session_id: str
    generated_at: str
    trade_count: int
    date_range: dict
    biases: List[dict]
    risk_profile: dict
    overall_risk_score: float
    top_recommendation: str


# ── Chat ──────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    session_id: str
    message: str
    history: Optional[List[ChatMessage]] = []


class ChatResponse(BaseModel):
    response: str
    onboarding_complete: bool
    turn_count: int
    updated_report: Optional[dict] = None


# ── Onboarding ────────────────────────────────────────────────────────────────

class OnboardingStatus(BaseModel):
    onboarding_complete: bool
    turn_count: int
    psychological_profile: Optional[dict] = None
