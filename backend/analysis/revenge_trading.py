"""
Revenge trading bias detector.
All operations use vectorized pandas — no Python loops.
"""
import pandas as pd
import numpy as np
from analysis.utils import is_loss, time_gap_minutes, rolling_avg_quantity, severity_from_score


def detect_revenge_trading(df: pd.DataFrame) -> dict:
    n = len(df)
    if n < 2:
        return _empty_result()

    loss_mask = is_loss(df)
    signals = []
    score = 0.0

    # 1. size_increase_after_loss: next qty > 1.5× current qty after a loss. Weight 0.40
    qty = df["quantity"].values
    next_qty = pd.Series(qty).shift(-1).fillna(0).values
    after_loss_spike = loss_mask.values & (next_qty > 1.5 * qty)
    loss_count = int(loss_mask.sum())
    size_spike_count = int(after_loss_spike.sum())
    sig1_triggered = (size_spike_count / loss_count > 0.15) if loss_count > 0 else False
    if sig1_triggered:
        score += 0.40
    signals.append({
        "label": "Position size increase after loss (>1.5×)",
        "value": size_spike_count,
        "threshold": max(1, int(loss_count * 0.15)),
        "triggered": sig1_triggered,
    })

    # 2. streak_escalation: runs of 3+ consecutive losses, next trade qty > 1.5× rolling avg. Weight 0.40
    # Vectorized consecutive loss run detection using cumsum trick
    loss_int = loss_mask.astype(int)
    # group non-loss positions to create streak reset
    group_id = (loss_int != loss_int.shift()).cumsum()
    streak_len = loss_int.groupby(group_id).transform("sum") * loss_int
    streak_3plus_end = (streak_len >= 3) & loss_mask  # rows that END a streak of 3+
    # next trade after a streak end
    next_qty_series = df["quantity"].shift(-1)
    roll_avg = rolling_avg_quantity(df)
    streak_escalation_count = int(
        (streak_3plus_end & (next_qty_series > 1.5 * roll_avg)).sum()
    )
    sig2_triggered = streak_escalation_count > 0
    if sig2_triggered:
        score += 0.40
    signals.append({
        "label": "Size escalation after 3+ loss streak",
        "value": streak_escalation_count,
        "threshold": 0,
        "triggered": sig2_triggered,
    })

    # 3. drawdown_rush: balance drop > 10% within 15-min window, new trade after. Weight 0.20
    balance = df["balance"]
    running_peak = balance.cummax()
    drawdown_pct = (running_peak - balance) / running_peak.replace(0, float("nan"))
    gaps = time_gap_minutes(df)
    # Within 15 minutes of a >10% drawdown event
    drawdown_rush = (drawdown_pct > 0.10) & (gaps < 15)
    drawdown_rush_count = int(drawdown_rush.sum())
    sig3_triggered = drawdown_rush_count > 0
    if sig3_triggered:
        score += 0.20
    signals.append({
        "label": "Trading during >10% drawdown within 15 min",
        "value": drawdown_rush_count,
        "threshold": 0,
        "triggered": sig3_triggered,
    })

    score = min(1.0, max(0.0, score))
    severity = severity_from_score(score)

    summary = (
        f"Analyzed {n} trades with {loss_count} losses. "
        f"{size_spike_count} times you increased position size by 1.5× or more immediately after a loss. "
        f"{streak_escalation_count} loss streaks of 3+ trades were followed by a size escalation. "
        f"{drawdown_rush_count} trades were placed during an active drawdown (>10% drop within 15 min)."
    )

    recs = []
    if sig1_triggered:
        recs.append({"type": "size", "text": f"You increased size after losses {size_spike_count} times — reduce position size by 25% after any losing trade, not increase."})
    if sig2_triggered:
        recs.append({"type": "streak", "text": f"After loss streaks of 3+, you escalated. Add a rule: after 3 consecutive losses, sit out for 1 hour minimum."})
    if sig3_triggered:
        recs.append({"type": "drawdown", "text": f"You traded {drawdown_rush_count} times during a 10%+ balance drawdown. Implement a daily drawdown limit — stop at 10% loss."})

    return {
        "bias": "revenge_trading",
        "score": round(score, 3),
        "severity": severity,
        "signals": signals,
        "summary": summary,
        "recommendations": recs,
    }


def _empty_result():
    return {
        "bias": "revenge_trading",
        "score": 0.0,
        "severity": "low",
        "signals": [],
        "summary": "Insufficient data for revenge trading analysis.",
        "recommendations": [],
    }
