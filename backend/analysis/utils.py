"""Shared utility functions for all bias detectors. All operations are vectorized."""
import pandas as pd


def is_loss(df: pd.DataFrame) -> pd.Series:
    """Returns boolean Series where profit_loss < 0."""
    return df["profit_loss"] < 0


def is_win(df: pd.DataFrame) -> pd.Series:
    """Returns boolean Series where profit_loss > 0."""
    return df["profit_loss"] > 0


def time_gap_minutes(df: pd.DataFrame) -> pd.Series:
    """Returns minutes between consecutive timestamps (first row = NaT → 0)."""
    gaps = df["timestamp"].diff().dt.total_seconds() / 60.0
    return gaps.fillna(0)


def rolling_avg_quantity(df: pd.DataFrame, window: int = 5) -> pd.Series:
    """Rolling average of quantity over last `window` trades."""
    return df["quantity"].rolling(window=window, min_periods=1).mean()


def severity_from_score(score: float) -> str:
    if score >= 0.65:
        return "high"
    elif score >= 0.35:
        return "medium"
    return "low"
