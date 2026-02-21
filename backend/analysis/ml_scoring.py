import pandas as pd
import numpy as np
import joblib
import os

model_path = os.path.join(os.path.dirname(__file__), "..", "bias_model.joblib")
_ml_model = None

def get_model():
    global _ml_model
    if _ml_model is None and os.path.exists(model_path):
        _ml_model = joblib.load(model_path)
    return _ml_model

def extract_features(df):
    df = df.copy()
    if not pd.api.types.is_datetime64_any_dtype(df["timestamp"]):
        df["timestamp"] = pd.to_datetime(df["timestamp"])
    
    df = df.sort_values("timestamp")
    
    # Feature 1: Trade frequency (avg seconds between trades)
    if len(df) > 1:
        time_diffs = df["timestamp"].diff().dt.total_seconds().dropna()
        avg_time_between_trades = time_diffs.mean()
    else:
        avg_time_between_trades = 3600
        
    # Feature 2: Loss to Win ratio
    wins = df[df["profit_loss"] > 0]["profit_loss"]
    losses = df[df["profit_loss"] < 0]["profit_loss"]
    
    avg_win = wins.mean() if len(wins) > 0 else 0.001
    avg_loss = abs(losses.mean()) if len(losses) > 0 else 0.001
    loss_win_ratio = avg_loss / avg_win if avg_win > 0 else 1.0
    
    # Feature 3: Time to re-entry after loss
    re_entry_times = []
    df_reset = df.reset_index(drop=True)
    for i in range(len(df_reset) - 1):
        if df_reset.loc[i, "profit_loss"] < 0:
            re_entry_times.append((df_reset.loc[i+1, "timestamp"] - df_reset.loc[i, "timestamp"]).total_seconds())
            
    avg_time_after_loss = np.mean(re_entry_times) if len(re_entry_times) > 0 else avg_time_between_trades

    # Feature 4: win rate
    win_rate = len(wins) / len(df) if len(df) > 0 else 0.5
    
    # Feature 5: holding time equivalent (proxy by number of shares or volume metrics or just pnl var)
    pnl_std = df["profit_loss"].std() if len(df) > 1 else 0
    
    return {
        "avg_time_between_trades": avg_time_between_trades,
        "loss_win_ratio": loss_win_ratio,
        "avg_time_after_loss": avg_time_after_loss,
        "win_rate": win_rate,
        "pnl_std": pnl_std
    }


def predict_bias_scores(df: pd.DataFrame) -> dict:
    """Predict Overtrading, Loss Aversion, and Revenge Trading scores"""
    model = get_model()
    if model is None:
        return {"overtrading": 0, "loss_aversion": 0, "revenge": 0}
        
    features = extract_features(df)
    X = pd.DataFrame([features])
    
    # Columns must match training: "avg_time_between_trades", "loss_win_ratio", "avg_time_after_loss", "win_rate", "pnl_std"
    X = X[["avg_time_between_trades", "loss_win_ratio", "avg_time_after_loss", "win_rate", "pnl_std"]]
    
    preds = model.predict(X)[0] # Array of 3
    # Targets were modeled as: overtrading, loss_aversion, revenge
    return {
        "overtrading": int(np.clip(preds[0], 0, 100)),
        "loss_aversion": int(np.clip(preds[1], 0, 100)),
        "revenge": int(np.clip(preds[2], 0, 100))
    }
