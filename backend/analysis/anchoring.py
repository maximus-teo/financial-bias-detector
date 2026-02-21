"""
Anchoring bias detector (bonus).
Traders anchor to entry price and refuse to cut losses.
All operations use vectorized pandas — no Python loops.
"""
import pandas as pd
import numpy as np
from analysis.utils import is_loss, is_win, severity_from_score


def detect_anchoring(df: pd.DataFrame) -> dict:
    n = len(df)
    if n < 5:
        return _empty_result()

    loss_mask = is_loss(df)
    win_mask = is_win(df)
    signals = []
    score = 0.0

    # 1. loss_held_long: losing trades where price deviated >5% from entry
    #    but winning trades at same deviation were closed (inferred from sequence position)
    entry = df["entry_price"]
    exit_ = df["exit_price"]
    price_deviation_pct = ((exit_ - entry).abs() / entry.replace(0, float("nan"))).fillna(0)

    large_deviation = price_deviation_pct > 0.05

    loss_large_dev = int((loss_mask & large_deviation).sum())
    win_large_dev = int((win_mask & large_deviation).sum())

    total_large_dev = loss_large_dev + win_large_dev
    # Anchoring: disproportionate losses with large deviation vs wins
    anchoring_ratio = loss_large_dev / total_large_dev if total_large_dev > 0 else 0.0
    sig1_triggered = anchoring_ratio > 0.60 and loss_large_dev >= 3
    if sig1_triggered:
        score += 0.60
    signals.append({
        "label": "Losses held past 5% price deviation vs wins closed early",
        "value": loss_large_dev,
        "threshold": int(total_large_dev * 0.60),
        "triggered": sig1_triggered,
        "timestamp": f"{anchoring_ratio:.0%} of large-deviation trades were losses"
    })

    # 2. entry_price_clustering: trades opened near round numbers (entry % 10 < 0.5)
    near_round = (df["entry_price"] % 10) < 0.5
    round_count = int(near_round.sum())
    round_pct = round_count / n
    sig2_triggered = round_pct > 0.40
    if sig2_triggered:
        score += 0.40
    signals.append({
        "label": "Entry price clustering near round numbers",
        "value": round_count,
        "threshold": int(n * 0.40),
        "triggered": sig2_triggered,
    })

    score = min(1.0, max(0.0, score))
    severity = severity_from_score(score)

    summary = (
        f"Anchoring analysis across {n} trades. "
        f"{loss_large_dev} losing trades deviated >5% from entry before being closed, "
        f"vs {win_large_dev} winning trades at the same deviation threshold "
        f"({anchoring_ratio:.0%} of large-deviation trades ended as losses). "
        f"{round_count} of {n} trades ({round_pct:.0%}) were entered near round price numbers."
    )

    recs = []
    if sig1_triggered:
        recs.append({"type": "anchor", "text": f"{loss_large_dev} losses were allowed to drift 5%+ from entry — you may be anchoring to your entry price. Set mechanical stops at entry ± 3%."})
    if sig2_triggered:
        recs.append({"type": "price", "text": f"{round_count} entries ({round_pct:.0%}) were near round price levels. These are often psychological anchors — use limit orders at non-round prices to get better fills."})

    return {
        "bias": "anchoring",
        "score": round(score, 3),
        "severity": severity,
        "signals": signals,
        "summary": summary,
        "recommendations": recs,
    }


def _empty_result():
    return {
        "bias": "anchoring",
        "score": 0.0,
        "severity": "low",
        "signals": [],
        "summary": "Insufficient data for anchoring analysis.",
        "recommendations": [],
    }
