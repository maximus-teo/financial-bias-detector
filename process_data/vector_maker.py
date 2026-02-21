import pandas as pd
import numpy as np
from scipy.stats import entropy


def extract_behavioral_fingerprint(file_path: str) -> dict:
    """
    Extracts behavioral trading features from a CSV file
    and compresses them into a fingerprint vector.
    Designed for speed and large datasets.
    """

    # -------------------------
    # 1. FAST LOAD WITH DTYPES
    # -------------------------
    df = pd.read_csv(
        file_path,
        parse_dates=["timestamp"],
        dtype={
            "asset": "category",
            "side": "category",
            "quantity": "float32",
            "entry_price": "float32",
            "exit_price": "float32",
            "profit_loss": "float32",
            "balance": "float32"
        }
    )

    if len(df) < 2:
        raise ValueError("Not enough trades to analyze.")

    df = df.sort_values("timestamp")

    # -------------------------
    # 2. DERIVED COLUMNS (O(n))
    # -------------------------
    df["is_loss"] = df["profit_loss"] < 0
    df["trade_value"] = df["quantity"] * df["entry_price"]
    df["time_diff"] = df["timestamp"].diff().dt.total_seconds()

    # Remove first NaN time_diff
    df = df.iloc[1:]

    # -------------------------
    # 3. OVERTRADING FEATURES
    # -------------------------
    total_trades = len(df)

    total_time = (
        df["timestamp"].iloc[-1] - df["timestamp"].iloc[0]
    ).total_seconds()

    trades_per_hour = total_trades / (total_time / 3600 + 1e-9)
    avg_time_between = df["time_diff"].mean()
    short_interval_ratio = (df["time_diff"] < 60).mean()

    # -------------------------
    # 4. LOSS AVERSION FEATURES
    # -------------------------
    loss_mask = df["is_loss"]
    win_mask = ~loss_mask

    avg_win = df.loc[win_mask, "profit_loss"].mean()
    avg_loss = df.loc[loss_mask, "profit_loss"].mean()

    loss_magnitude_ratio = abs(avg_loss) / (abs(avg_win) + 1e-9)

    win_rate = win_mask.mean()

    # Profit factor (recomputed properly)
    profit_factor = (
        abs(avg_win / (avg_loss + 1e-9))
        if abs(avg_loss) > 1e-9 else 0
    )


#entropy
    # Compute trade size movement
    df["size_diff"] = df["trade_value"].diff()

    # Encode behavior states
    def encode_state(x):
        if x < -0.01:
            return 0   # size decreased
        elif x > 0.01:
            return 2   # size increased
        else:
            return 1   # stable

    df["behavior_state"] = df["size_diff"].apply(encode_state)

    # Extract post-loss behavior sequence
    post_loss_sequence = df.loc[
        df["is_loss"].shift(1) == True,
        "behavior_state"
    ].dropna()

    # Compute entropy
    if len(post_loss_sequence) > 0:
        counts = post_loss_sequence.value_counts(normalize=True)
        revenge_entropy = entropy(counts.values)
    else:
        revenge_entropy = 0
    # -------------------------
    # 6. STABILITY / RISK FEATURES
    # -------------------------
    pnl_std = df["profit_loss"].std()
    trade_size_std = df["trade_value"].std()

    # -------------------------
    # 7. COMPRESS INTO FINGERPRINT
    # -------------------------
    fingerprint = {
        # Overtrading Signals
        "trades_per_hour": trades_per_hour,
        "avg_time_between": avg_time_between,
        "short_interval_ratio": short_interval_ratio,

        # Loss Aversion Signals
        "loss_magnitude_ratio": loss_magnitude_ratio,
        "win_rate": win_rate,
        "profit_factor": profit_factor,

        # Revenge Trading Signals
        "revenge_entropy": revenge_entropy,

        # Risk Stability Signals
        # "avg_trade_size": avg_trade_size,
        "pnl_volatility": pnl_std,
        "trade_size_volatility": trade_size_std,
    }

    fingerprint = {k: float(v) for k, v in fingerprint.items()}

    return fingerprint