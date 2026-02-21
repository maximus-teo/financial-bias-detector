import io
import json
from typing import Tuple, List
import pandas as pd


REQUIRED_COLUMNS = [
    "timestamp", "asset", "side", "quantity",
    "entry_price", "exit_price", "profit_loss", "balance"
]

DTYPE_MAP = {
    "asset": str,
    "side": str,
    "quantity": float,
    "entry_price": float,
    "exit_price": float,
    "profit_loss": float,
    "balance": float,
}


def _validate_and_clean(df: pd.DataFrame) -> pd.DataFrame:
    """Validate columns and cast dtypes."""
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    df = df[REQUIRED_COLUMNS].copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"])

    for col, dtype in DTYPE_MAP.items():
        df[col] = df[col].astype(dtype)

    df = df.sort_values("timestamp").reset_index(drop=True)
    return df


def parse_csv_upload(content: bytes) -> Tuple[pd.DataFrame, str]:
    """Parse CSV bytes, validate schema, return (DataFrame, json_string).
    Uses chunked reading for large files."""
    # For large files, read in chunks
    chunk_size = 50000
    if len(content) > 10 * 1024 * 1024:  # > 10MB
        chunks = []
        for chunk in pd.read_csv(
            io.BytesIO(content),
            dtype=DTYPE_MAP,
            parse_dates=["timestamp"],
            chunksize=chunk_size,
        ):
            chunks.append(chunk)
        df = pd.concat(chunks, ignore_index=True)
    else:
        df = pd.read_csv(
            io.BytesIO(content),
            dtype=DTYPE_MAP,
            parse_dates=["timestamp"],
        )
    df = _validate_and_clean(df)
    trades_json = df.to_json(orient="records", date_format="iso")
    return df, trades_json

def parse_json_upload(content: bytes) -> Tuple[pd.DataFrame, str]:
    """Parse JSON bytes, validate schema, return (DataFrame, json_string)."""
    df = pd.read_json(io.BytesIO(content), orient="records")
    df = _validate_and_clean(df)
    trades_json = df.to_json(orient="records", date_format="iso")
    return df, trades_json


def parse_manual_trades(trades: List) -> Tuple[pd.DataFrame, str]:
    """Convert list of TradeRecord pydantic objects to DataFrame."""
    records = [t.model_dump() for t in trades]
    df = pd.DataFrame(records)
    df = _validate_and_clean(df)
    trades_json = df.to_json(orient="records", date_format="iso")
    return df, trades_json
