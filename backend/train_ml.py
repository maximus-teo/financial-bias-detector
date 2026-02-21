import pandas as pd
import numpy as np
import os
from sklearn.ensemble import RandomForestRegressor
import joblib

DATA_DIR = "../trading_datasets"
MODELS_DIR = "."

def extract_features(df):
    """Extract features from a DataFrame (or chunk of trades)"""
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

def build_dataset():
    records = []
    
    targets = {
        "calm_trader": {"overtrading": 5, "loss_aversion": 5, "revenge": 5},
        "overtrader": {"overtrading": 95, "loss_aversion": 20, "revenge": 30},
        "loss_averse_trader": {"overtrading": 20, "loss_aversion": 95, "revenge": 25},
        "revenge_trader": {"overtrading": 40, "loss_aversion": 30, "revenge": 95},
    }
    
    for filename, label_scores in targets.items():
        path = os.path.join(DATA_DIR, f"{filename}.csv")
        if not os.path.exists(path):
            print(f"Skipping {path} (not found)")
            continue
            
        df = pd.read_csv(path)
        
        # split into chunks of 50 trades each to generate multiple samples
        chunk_size = 50
        for i in range(0, len(df), chunk_size):
            chunk = df.iloc[i : i + chunk_size]
            if len(chunk) < 10:
                continue
            
            features = extract_features(chunk)
            # Add targets
            row = {**features, **label_scores}
            records.append(row)
            
    return pd.DataFrame(records)

if __name__ == "__main__":
    df = build_dataset()
    if len(df) == 0:
        print("No data processed")
        exit()
        
    print(f"Built dataset with {len(df)} samples")
    
    X = df[["avg_time_between_trades", "loss_win_ratio", "avg_time_after_loss", "win_rate", "pnl_std"]]
    y = df[["overtrading", "loss_aversion", "revenge"]]
    
    # Train random forest model
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X, y)
    
    # Save model
    joblib.dump(model, "bias_model.joblib")
    print("Model saved to bias_model.joblib")
