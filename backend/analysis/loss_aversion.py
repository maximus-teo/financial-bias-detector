"""
Loss aversion bias detector.
All operations use vectorized pandas — no Python loops.
"""
import pandas as pd
import numpy as np
from analysis.utils import is_loss, is_win, severity_from_score


def detect_loss_aversion(df: pd.DataFrame) -> dict:
    n = len(df)
    if n == 0:
        return _empty_result()

    loss_mask = is_loss(df)
    win_mask = is_win(df)

    losses = df.loc[loss_mask, "profit_loss"]
    wins = df.loc[win_mask, "profit_loss"]

    avg_loss = float(losses.abs().mean()) if len(losses) > 0 else 0.0
    avg_win = float(wins.mean()) if len(wins) > 0 else 0.0
    win_count = int(win_mask.sum())
    loss_count = int(loss_mask.sum())
    win_rate = win_count / n if n > 0 else 0.0

    signals = []
    score = 0.0

    # 1. avg_loss_larger: mean(|loss|) > 1.5 * mean(win). Weight 0.35
    rr_ratio = avg_loss / avg_win if avg_win > 0 else 0.0
    sig1_triggered = avg_loss > 1.5 * avg_win if avg_win > 0 else False
    if sig1_triggered:
        score += 0.35
    signals.append({
        "label": "Avg loss larger than 1.5× avg win",
        "value": round(avg_loss, 2),
        "threshold": round(avg_win * 1.5, 2),
        "triggered": sig1_triggered,
    })

    # 2. early_winner_exit: wins where profit < 30% of potential = (exit-entry)*qty. Weight 0.20
    if win_count > 0:
        win_df = df.loc[win_mask].copy()
        potential = (win_df["exit_price"] - win_df["entry_price"]).abs() * win_df["quantity"]
        early_exit_mask = win_df["profit_loss"] < 0.30 * potential
        early_exit_count = int(early_exit_mask.sum())
        early_exit_pct = early_exit_count / win_count
        sig2_triggered = early_exit_pct > 0.30
    else:
        early_exit_count = 0
        early_exit_pct = 0.0
        sig2_triggered = False

    if sig2_triggered:
        score += 0.20
    signals.append({
        "label": "Early winner exits (<30% of potential captured)",
        "value": early_exit_count,
        "threshold": int(win_count * 0.30),
        "triggered": sig2_triggered,
    })

    # 3. imbalanced_rr: mean(|loss|) / mean(win) > 1.5. Weight 0.35
    sig3_triggered = rr_ratio > 1.5 if avg_win > 0 else False
    if sig3_triggered:
        score += 0.35
    signals.append({
        "label": "Imbalanced risk/reward ratio",
        "value": round(rr_ratio, 2),
        "threshold": 1.5,
        "triggered": sig3_triggered,
    })

    # 4. low_expectancy: win_rate < 0.4 AND avg_loss > avg_win. Weight 0.10
    sig4_triggered = win_rate < 0.40 and avg_loss > avg_win
    if sig4_triggered:
        score += 0.10
    signals.append({
        "label": "Low expectancy (win rate < 40% with unfavorable R/R)",
        "value": round(win_rate, 3),
        "threshold": 0.40,
        "triggered": sig4_triggered,
    })

    score = min(1.0, max(0.0, score))
    severity = severity_from_score(score)

    summary = (
        f"Win rate: {win_rate:.0%} ({win_count} wins, {loss_count} losses). "
        f"Average loss: ${avg_loss:.2f}, average win: ${avg_win:.2f} (ratio: {rr_ratio:.2f}×). "
        f"{early_exit_count} winning trades were closed before capturing 30% of potential profit."
    )

    recs = []
    if sig1_triggered or sig3_triggered:
        recs.append({"type": "stop-loss", "text": f"Your average loss (${avg_loss:.2f}) is {rr_ratio:.1f}× your average win (${avg_win:.2f}). Set a hard stop-loss at 1× your average win target."})
    if sig2_triggered:
        recs.append({"type": "target", "text": f"You exited {early_exit_count} winners early — let profits run to at least 3× your usual stop distance before closing."})
    if sig4_triggered:
        recs.append({"type": "expectancy", "text": f"With a {win_rate:.0%} win rate and unfavorable R/R, your system has negative expectancy. Improve R/R to at least 2:1 before increasing size."})

    return {
        "bias": "loss_aversion",
        "score": round(score, 3),
        "severity": severity,
        "signals": signals,
        "summary": summary,
        "recommendations": recs,
    }


def _empty_result():
    return {
        "bias": "loss_aversion",
        "score": 0.0,
        "severity": "low",
        "signals": [],
        "summary": "No trade data available.",
        "recommendations": [],
    }
