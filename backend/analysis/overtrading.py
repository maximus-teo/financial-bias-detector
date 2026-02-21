"""
Overtrading bias detector.
All operations use vectorized pandas — no Python loops.
"""
import pandas as pd
from analysis.utils import time_gap_minutes, severity_from_score


def detect_overtrading(df: pd.DataFrame) -> dict:
    n = len(df)
    if n == 0:
        return _empty_result()

    signals = []
    score = 0.0

    # 1. Hourly spike: any hour > 5 trades
    hourly_counts = df.groupby(df["timestamp"].dt.hour).size()
    max_hourly = int(hourly_counts.max())
    peak_hour = int(hourly_counts.idxmax())
    hourly_triggered = max_hourly > 5
    if hourly_triggered:
        score += 0.25
    signals.append({
        "label": "Hourly spike",
        "value": max_hourly,
        "threshold": 5,
        "triggered": hourly_triggered,
        "timestamp": f"Hour {peak_hour:02d}:00"
    })

    # 2. Rapid succession: consecutive gaps < 10 min > 10% of trades
    gaps = time_gap_minutes(df)
    rapid_pairs = int((gaps < 10).sum())
    rapid_ratio = rapid_pairs / n
    rapid_triggered = rapid_ratio > 0.10
    if rapid_triggered:
        score += 0.25
    signals.append({
        "label": "Rapid succession trades (<10 min gap)",
        "value": rapid_pairs,
        "threshold": int(n * 0.10),
        "triggered": rapid_triggered,
    })

    # 3. Post-event trading: trade opened within 30 min after abs(PL) > 5% of balance
    pct_impact = (df["profit_loss"].abs() / df["balance"].replace(0, float("nan"))).fillna(0)
    big_events = pct_impact > 0.05
    # Shift: next trade's time gap from current
    next_gap = time_gap_minutes(df).shift(-1).fillna(999)
    post_event_count = int((big_events & (next_gap < 30)).sum())
    post_event_triggered = post_event_count > 0
    if post_event_triggered:
        score += 0.25
    signals.append({
        "label": "Post high-impact event trading (<30 min)",
        "value": post_event_count,
        "threshold": 0,
        "triggered": post_event_triggered,
    })

    # 4. Trade frequency ratio: total / mean(balance) > 0.005
    avg_balance = float(df["balance"].mean())
    freq_ratio = n / avg_balance if avg_balance > 0 else 0
    freq_triggered = freq_ratio > 0.005
    if freq_triggered:
        score += 0.25
    signals.append({
        "label": "Trade frequency ratio (trades/avg balance)",
        "value": round(freq_ratio, 6),
        "threshold": 0.005,
        "triggered": freq_triggered,
    })

    score = min(1.0, max(0.0, score))
    severity = severity_from_score(score)

    summary = (
        f"Traded {n} times total. Peak activity: {max_hourly} trades in a single hour "
        f"(hour {peak_hour:02d}:00). {rapid_pairs} trades were placed within 10 minutes "
        f"of the previous trade ({rapid_ratio:.0%} of all trades). "
        f"{post_event_count} trades occurred within 30 minutes of a high-impact event."
    )

    recs = []
    if hourly_triggered:
        recs.append({"type": "limit", "text": f"You hit {max_hourly} trades in one hour — cap yourself at 5 trades/hour to reduce noise trading."})
    if rapid_triggered:
        recs.append({"type": "cooldown", "text": f"Implement a 10-minute cooldown between trades; {rapid_pairs} of your trades violated this rule."})
    if post_event_triggered:
        recs.append({"type": "pause", "text": f"After {post_event_count} large wins/losses you traded again within 30 minutes. Force a pause after high-emotion trades."})

    return {
        "bias": "overtrading",
        "score": round(score, 3),
        "severity": severity,
        "signals": signals,
        "summary": summary,
        "recommendations": recs,
    }


def _empty_result():
    return {
        "bias": "overtrading",
        "score": 0.0,
        "severity": "low",
        "signals": [],
        "summary": "No trade data available.",
        "recommendations": [],
    }
