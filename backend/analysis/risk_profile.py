"""
Risk profile computation across all bias results.
"""
import pandas as pd
import numpy as np


def compute_risk_profile(df: pd.DataFrame, bias_results: list) -> dict:
    n = len(df)

    # Map bias name → score
    bias_map = {b["bias"]: b["score"] for b in bias_results}

    overtrading = bias_map.get("overtrading", 0.0)
    loss_aversion = bias_map.get("loss_aversion", 0.0)
    revenge = bias_map.get("revenge_trading", 0.0)
    anchoring = bias_map.get("anchoring", 0.0)

    # Volatility contribution: std(profit_loss) / mean(balance)
    mean_balance = float(df["balance"].mean()) if n > 0 else 1.0
    pl_std = float(df["profit_loss"].std()) if n > 1 else 0.0
    volatility_contribution = min(1.0, pl_std / mean_balance if mean_balance > 0 else 0.0)

    # Weighted score (biases weighted equally, volatility adds 20% extra weight)
    raw_score = (
        overtrading * 0.25
        + loss_aversion * 0.25
        + revenge * 0.25
        + anchoring * 0.15
        + volatility_contribution * 0.10
    )
    score = round(min(100.0, raw_score * 100), 1)

    if score >= 65:
        profile = "Aggressive"
    elif score >= 35:
        profile = "Moderate"
    else:
        profile = "Conservative"

    return {
        "score": score,
        "profile": profile,
        "components": {
            "overtrading_contribution": round(overtrading * 0.25 * 100, 1),
            "loss_aversion_contribution": round(loss_aversion * 0.25 * 100, 1),
            "revenge_contribution": round(revenge * 0.25 * 100, 1),
            "anchoring_contribution": round(anchoring * 0.15 * 100, 1),
            "volatility_contribution": round(volatility_contribution * 0.10 * 100, 1),
        },
    }
