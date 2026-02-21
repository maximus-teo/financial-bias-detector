"""
Bias tools for the LangGraph agent.
All 8 tools + psychological profile tools.
"""
import json
import logging
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


# ── Tool implementations ───────────────────────────────────────────────────────

def get_overtrading_analysis(session_id: str, db: Session) -> str:
    report = _get_cached_report(session_id, db)
    if not report:
        return "No analysis found. Ask the user to run analysis first."
    bias = _find_bias(report, "overtrading")
    return json.dumps(bias, indent=2)


def get_loss_aversion_analysis(session_id: str, db: Session) -> str:
    report = _get_cached_report(session_id, db)
    if not report:
        return "No analysis found. Ask the user to run analysis first."
    bias = _find_bias(report, "loss_aversion")
    return json.dumps(bias, indent=2)


def get_revenge_trading_analysis(session_id: str, db: Session) -> str:
    report = _get_cached_report(session_id, db)
    if not report:
        return "No analysis found. Ask the user to run analysis first."
    bias = _find_bias(report, "revenge_trading")
    return json.dumps(bias, indent=2)


def get_full_report(session_id: str, db: Session) -> str:
    report = _get_cached_report(session_id, db)
    if not report:
        return "No analysis found. Ask the user to run analysis first."
    # Return without trades array to keep token count manageable
    report_copy = {k: v for k, v in report.items() if k != "trades"}
    return json.dumps(report_copy, indent=2)


def get_trade_summary(session_id: str, db: Session) -> str:
    report = _get_cached_report(session_id, db)
    if not report:
        return "No analysis found."
    stats = report.get("summary_stats", {})
    return json.dumps({
        "trade_count": report.get("trade_count"),
        "date_range": report.get("date_range"),
        **stats,
    }, indent=2)


def get_risk_profile(session_id: str, db: Session) -> str:
    report = _get_cached_report(session_id, db)
    if not report:
        return "No analysis found."
    return json.dumps(report.get("risk_profile", {}), indent=2)


def compare_bias_scores(session_id: str, db: Session) -> str:
    report = _get_cached_report(session_id, db)
    if not report:
        return "No analysis found."
    biases = report.get("biases", [])
    ranked = sorted(biases, key=lambda b: b["score"], reverse=True)
    return json.dumps([
        {"bias": b["bias"], "score": b["score"], "severity": b["severity"]}
        for b in ranked
    ], indent=2)


def update_psychological_profile(session_id: str, profile_update: str, db: Session) -> str:
    """Merge profile_update JSON into the stored profile."""
    from models.db_models import TradingSession
    session = db.query(TradingSession).filter(TradingSession.id == session_id).first()
    if not session:
        return "Session not found."
    try:
        update_dict = json.loads(profile_update)
    except json.JSONDecodeError:
        return "Invalid JSON in profile_update."

    existing = session.get_psychological_profile()
    existing.update(update_dict)
    session.set_psychological_profile(existing)

    # Check if onboarding is complete
    if update_dict.get("onboarding_complete", False):
        session.onboarding_complete = True

    db.commit()
    return "Profile updated."


def get_psychological_profile(session_id: str, db: Session) -> str:
    from models.db_models import TradingSession
    session = db.query(TradingSession).filter(TradingSession.id == session_id).first()
    if not session:
        return "Session not found."
    return json.dumps(session.get_psychological_profile(), indent=2)


# ── OpenAI tool schemas ────────────────────────────────────────────────────────

TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "get_overtrading_analysis",
            "description": "Returns the overtrading bias analysis for the trader's session, including signals, score, severity, and recommendations.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_loss_aversion_analysis",
            "description": "Returns the loss aversion bias analysis including win/loss ratios, early exits, and R/R imbalance.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_revenge_trading_analysis",
            "description": "Returns the revenge trading bias analysis including position sizing after losses and drawdown behavior.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },

    {
        "type": "function",
        "function": {
            "name": "get_full_report",
            "description": "Returns the complete bias analysis report for this session, including all biases and risk profile.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_trade_summary",
            "description": "Returns key trade statistics: trade count, win rate, average P&L, date range.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_risk_profile",
            "description": "Returns the overall risk profile (Aggressive/Moderate/Conservative) and component scores.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compare_bias_scores",
            "description": "Returns all 3 bias scores ranked worst to best — useful for prioritizing which bias to address first.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_psychological_profile",
            "description": "Saves or updates the trader's psychological profile from onboarding. Use after collecting onboarding answers. Set onboarding_complete=true when all 4 questions are answered.",
            "parameters": {
                "type": "object",
                "properties": {
                    "profile_update": {
                        "type": "string",
                        "description": "JSON string with profile fields to merge. Example: '{\"post_loss_urge\": \"trade_again\", \"onboarding_complete\": true}'",
                    }
                },
                "required": ["profile_update"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_psychological_profile",
            "description": "Retrieves the stored psychological profile for this session.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
]

# Map tool name → function
TOOL_MAP = {
    "get_overtrading_analysis": get_overtrading_analysis,
    "get_loss_aversion_analysis": get_loss_aversion_analysis,
    "get_revenge_trading_analysis": get_revenge_trading_analysis,
    "get_full_report": get_full_report,
    "get_trade_summary": get_trade_summary,
    "get_risk_profile": get_risk_profile,
    "compare_bias_scores": compare_bias_scores,
    "update_psychological_profile": update_psychological_profile,
    "get_psychological_profile": get_psychological_profile,
}


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_cached_report(session_id: str, db: Session) -> dict | None:
    from models.db_models import TradingSession
    session = db.query(TradingSession).filter(TradingSession.id == session_id).first()
    if not session or not session.report_json:
        return None
    return json.loads(session.report_json)


def _find_bias(report: dict, bias_name: str) -> dict:
    for b in report.get("biases", []):
        if b["bias"] == bias_name:
            return b
    return {"error": f"Bias '{bias_name}' not found in report."}
