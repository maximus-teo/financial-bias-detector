"""
Aggregator — runs all bias detectors concurrently using ThreadPoolExecutor.
"""
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

import pandas as pd

from analysis.overtrading import detect_overtrading
from analysis.loss_aversion import detect_loss_aversion
from analysis.revenge_trading import detect_revenge_trading
from analysis.anchoring import detect_anchoring
from analysis.risk_profile import compute_risk_profile


DETECTORS = [
    detect_overtrading,
    detect_loss_aversion,
    detect_revenge_trading,
    detect_anchoring,
]


def run_full_analysis(df: pd.DataFrame, session_id: str) -> dict:
    """
    Runs all detectors in parallel using ThreadPoolExecutor.
    Returns full report dict.
    """
    bias_results = [None] * len(DETECTORS)

    with ThreadPoolExecutor(max_workers=len(DETECTORS)) as executor:
        future_to_idx = {
            executor.submit(detector, df): idx
            for idx, detector in enumerate(DETECTORS)
        }
        for future in as_completed(future_to_idx):
            idx = future_to_idx[future]
            bias_results[idx] = future.result()

    # Compute overall risk score = weighted average of bias scores
    scores = [b["score"] for b in bias_results]
    overall_risk_score = round(sum(scores) / len(scores), 3) if scores else 0.0

    risk_profile = compute_risk_profile(df, bias_results)

    # Pick top recommendation from highest-scoring bias
    worst_bias = max(bias_results, key=lambda b: b["score"])
    top_rec = ""
    if worst_bias.get("recommendations"):
        top_rec = worst_bias["recommendations"][0]["text"]

    # Date range
    date_from = str(df["timestamp"].min())
    date_to = str(df["timestamp"].max())

    # Trade stats for frontend
    win_count = int((df["profit_loss"] > 0).sum())
    loss_count = int((df["profit_loss"] < 0).sum())
    win_rate = round(win_count / len(df), 3) if len(df) > 0 else 0.0
    avg_pnl = round(float(df["profit_loss"].mean()), 2) if len(df) > 0 else 0.0

    report = {
        "session_id": session_id,
        "generated_at": datetime.utcnow().isoformat(),
        "trade_count": len(df),
        "date_range": {"from": date_from, "to": date_to},
        "biases": bias_results,
        "risk_profile": risk_profile,
        "overall_risk_score": overall_risk_score,
        "top_recommendation": top_rec,
        "summary_stats": {
            "win_count": win_count,
            "loss_count": loss_count,
            "win_rate": win_rate,
            "avg_pnl": avg_pnl,
            "total_pnl": round(float(df["profit_loss"].sum()), 2),
        },
        # Serialized trade data for charts
        "trades": json.loads(df.to_json(orient="records", date_format="iso")),
    }

    return report
