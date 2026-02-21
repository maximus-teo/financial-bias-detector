# Bias Detection Specifications

## Performance Requirements
- All detectors must use pandas vectorized operations — NO row-by-row Python loops
- Must handle 100,000+ rows without timeout
- parse_csv must use pd.read_csv with dtype casting, not manual iteration
- Detectors receive a pd.DataFrame, not list[dict]

## Shared Utilities (analysis/utils.py)
````python
def is_loss(df: pd.DataFrame) -> pd.Series:      # profit_loss < 0
def is_win(df: pd.DataFrame) -> pd.Series:        # profit_loss > 0
def time_gap_minutes(df: pd.DataFrame) -> pd.Series:  # diff between consecutive timestamps in minutes
def rolling_avg_quantity(df: pd.DataFrame, window=5) -> pd.Series:
````

## Function signature for ALL detectors
````python
def detect_*(df: pd.DataFrame) -> dict:  # returns standard bias output shape
````

---

## 1. Overtrading — analysis/overtrading.py

### Signals
1. **hourly_spike**: trades grouped by hour-of-day. Triggered if any hour > 5 trades.
   Value = max count in any hour. Use: `df.groupby(df['timestamp'].dt.hour).size()`
2. **rapid_succession**: consecutive trade gaps < 10 min.
   Triggered if such pairs > 10% of total trades.
3. **post_event_trading**: trade opened within 30 min after abs(profit_loss) > 0.05 * balance.
   Use vectorized shift + time diff.
4. **trade_frequency_ratio**: total_trades / mean(balance). Triggered if > 0.005.

### Scoring: each signal = 0.25, clamped 0.0–1.0

---

## 2. Loss Aversion — analysis/loss_aversion.py

### Signals
1. **avg_loss_larger**: mean(abs(pl for losses)) > 1.5 * mean(pl for wins). Weight 0.35.
2. **early_winner_exit**: wins where profit_loss < 0.3 * potential = (exit-entry)*qty.
   Triggered if > 30% of wins qualify. Weight 0.20.
3. **imbalanced_rr**: mean(abs loss) / mean(win) > 1.5. Value = ratio. Weight 0.35.
4. **low_expectancy**: win_rate < 0.4 AND avg_loss > avg_win. Weight 0.10.

### Scoring: weighted sum of triggered signals, clamped 0.0–1.0

---

## 3. Revenge Trading — analysis/revenge_trading.py

### Signals
1. **size_increase_after_loss**: after each loss, next trade qty > 1.5x current qty.
   Use shift(). Triggered if this happens in > 15% of losses. Weight 0.40.
2. **streak_escalation**: find runs of 3+ consecutive losses using cumsum trick.
   Trade after streak has qty > 1.5x rolling avg. Weight 0.40.
3. **drawdown_rush**: balance drop > 10% within 15-min window, new trade opened after.
   Triggered if any instance found. Weight 0.20.

### Scoring: weighted sum, clamped 0.0–1.0

---

## 4. Bonus Bias — analysis/anchoring.py (implement this for extra judging points)

Anchoring bias: traders anchoring to their entry price and refusing to cut losses.

### Signals
1. **loss_held_long**: losing trades where exit_price deviation from entry > 5% held 
   (inferred from position in sequence) while winning trades at same deviation are closed
2. **entry_price_clustering**: many trades opened near round numbers (entry_price % 10 < 0.5)
   Triggered if > 40% of entries are near round numbers

---

## 5. Risk Profile Score — analysis/risk_profile.py
````python
def compute_risk_profile(df: pd.DataFrame, bias_results: list[dict]) -> dict:
    # Returns:
    {
      "score": 0-100,       # 100 = very risky behavior
      "profile": "Aggressive" | "Moderate" | "Conservative",
      "components": {
        "overtrading_contribution": float,
        "loss_aversion_contribution": float,
        "revenge_contribution": float,
        "volatility_contribution": float   # std(profit_loss) / mean(balance)
      }
    }
````

---

## 6. Aggregator — analysis/aggregator.py
````python
def run_full_analysis(df: pd.DataFrame, session_id: str) -> dict:
    # Runs all detectors in parallel using ThreadPoolExecutor
    # Computes overall_risk_score = weighted avg of bias scores
    # Computes risk_profile
    # Returns full report
````

Use ThreadPoolExecutor to run detectors concurrently — important for large datasets.

---

## Standard Bias Output Shape (unchanged)
````json
{
  "bias": "overtrading",
  "score": 0.74,
  "severity": "high",
  "signals": [
    {
      "label": "Hourly spike",
      "value": 12,
      "threshold": 5,
      "triggered": true,
      "timestamp": "optional"
    }
  ],
  "summary": "Specific to their data — reference actual numbers",
  "recommendations": [
    {"type": "limit", "text": "Specific actionable rec with their actual numbers"}
  ]
}
````

## Full Report Shape
````json
{
  "session_id": "...",
  "generated_at": "...",
  "trade_count": 142,
  "date_range": {"from": "...", "to": "..."},
  "biases": [{}, {}, {}, {}],
  "risk_profile": {},
  "overall_risk_score": 0.68,
  "top_recommendation": "..."
}
````