# Bias Detection Tool — Architecture Reference

## Stack
- Frontend: React + Vite + Tailwind + shadcn/ui + Recharts + Zustand + Framer Motion
- Backend: FastAPI + SQLAlchemy + SQLite + pandas
- Agent: LangGraph + Cerebras SDK (gpt-oss-120b)
- File Storage: backend/uploads/

## File Structure
````
project/
├── ARCHITECTURE.md
├── BIAS_SPECS.md
├── frontend/
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api/client.js
│       ├── store/sessionStore.js
│       ├── pages/
│       │   ├── Home.jsx            # upload + manual entry form
│       │   └── Dashboard.jsx
│       └── components/
│           ├── UploadZone.jsx
│           ├── TradeForm.jsx       # manual single trade entry
│           ├── BiasDashboard.jsx
│           ├── BiasCard.jsx
│           ├── RiskProfileBadge.jsx
│           ├── ChatPanel.jsx
│           └── charts/
│               ├── TradingHeatmap.jsx
│               ├── PnLTimeline.jsx
│               ├── WinLossBar.jsx
│               ├── BiasRadar.jsx       # radar chart of all 4 bias scores
│               └── DrawdownChart.jsx   # balance over time with drawdown shading
└── backend/
    ├── main.py
    ├── database.py
    ├── requirements.txt
    ├── .env.example
    ├── uploads/
    ├── models/
    │   ├── db_models.py
    │   └── schemas.py
    ├── analysis/
    │   ├── utils.py
    │   ├── overtrading.py
    │   ├── loss_aversion.py
    │   ├── revenge_trading.py
    │   ├── anchoring.py
    │   ├── risk_profile.py
    │   └── aggregator.py
    ├── agents/
    │   ├── state.py
    │   ├── graph.py
    │   └── prompts.py
    ├── tools/
    │   └── bias_tools.py
    └── storage/
        └── file_handler.py

## CSV Schema
| column       | type    |
|--------------|---------|
| timestamp    | datetime|
| asset        | string  |
| side         | string  |
| quantity     | float   |
| entry_price  | float   |
| exit_price   | float   |
| profit_loss  | float   |
| balance      | float   |

## API Endpoints
- POST /upload                → { session_id, trade_count, filename }
- POST /upload/manual         → accepts list of trade dicts, same response
- POST /analyze/{session_id}  → full report JSON
- GET  /report/{session_id}   → cached report
- POST /chat                  → { response: string }

## Agent Tools (all in tools/bias_tools.py)
- get_overtrading_analysis(session_id)
- get_loss_aversion_analysis(session_id)
- get_revenge_trading_analysis(session_id)
- get_anchoring_analysis(session_id)
- get_full_report(session_id)
- get_trade_summary(session_id)
- get_risk_profile(session_id)
- compare_bias_scores(session_id)    # returns all 4 scores ranked worst to best

## CORS: http://localhost:5173
````

---

## Updated Master Prompt

## Conversational Agent Modes

### Mode 1: Onboarding (triggers automatically on first chat message)
Agent asks a structured sequence of psychological profiling questions.
Must complete before entering free chat mode.

Questions sequence:
1. "Before we dive into your data, I'd like to understand your trading mindset. 
    How do you typically feel right after a losing trade — do you want to step 
    away, or do you feel the urge to trade again immediately?"
2. "When a trade is going against you, at what point do you usually decide to 
    close it — do you have a preset stop-loss, or does it depend on how you feel?"
3. "How many trades per day would you consider 'normal' for your strategy?"
4. "After a winning streak, do you tend to increase your position sizes, 
    decrease them, or keep them the same?"

Store responses in session psychological_profile JSON in DB.

### Mode 2: Reactive + Follow-up
After every substantive answer, agent asks ONE follow-up question tied to 
what the data shows AND what the user just said.

Example:
User: "Why is my loss aversion score so high?"
Agent: [explains based on data] ... "Given that, can I ask — when you're in 
a losing trade, do you find yourself checking the price more frequently hoping 
it'll recover, or do you tend to avoid looking at it?"

This follow-up response gets stored and used to personalize future recommendations.

### Psychological Profile Schema (stored as JSON in DB)
````json
{
  "post_loss_urge": "trade_again" | "step_away" | "unsure",
  "stop_loss_discipline": "preset" | "emotional" | "mixed",
  "expected_daily_trades": number,
  "winning_streak_behavior": "increase" | "decrease" | "same",
  "free_responses": [
    {"question": "...", "answer": "...", "inferred_trait": "..."}
  ],
  "inferred_profile": "Impulsive" | "Disciplined" | "Anxious" | "Overconfident"
}
````

### New DB column on TradingSession
- psychological_profile: str (JSON, nullable)
- onboarding_complete: bool (default False)
- chat_turn_count: int (default 0)
````

---

## New/updated files to add to your prompt
````
## Additional agent files beyond original plan:

### agents/prompts.py — replace with this structure:

ONBOARDING_SYSTEM_PROMPT = """
You are a trading psychology coach at National Bank of Canada conducting an 
initial assessment of a trader's behavioral tendencies.

You are in ONBOARDING MODE. Your job is to ask exactly the questions in the 
sequence defined below, one at a time, in a warm and non-clinical tone. 
Do NOT answer trading questions yet — gently redirect until onboarding is done.

Question sequence: {question_sequence}
Questions asked so far: {questions_asked}
Next question to ask: {next_question}

After each answer, briefly acknowledge what they said (1 sentence, empathetic),
then ask the next question. When all 4 are answered, say:
"Thanks — I've got a good sense of your approach. I've analyzed your trading 
history and I'm ready to walk you through what I found."
Then set onboarding_complete = true.
"""

COACHING_SYSTEM_PROMPT = """
You are a trading psychology coach at National Bank of Canada.

Trader's psychological profile from onboarding:
{psychological_profile}

Their bias analysis results are available via your tools.

Rules:
- Always call a tool before making any claim about their data
- Reference their onboarding answers when relevant 
  e.g. "You mentioned you usually step away after losses, but your data shows 
  you opened 3 trades within 10 minutes of your 5 largest losses"
- After every substantive answer, ask ONE follow-up question that either:
  a) Digs deeper into a psychological pattern you noticed
  b) Checks if a recommendation would actually work for their lifestyle
- Keep follow-up questions short, conversational, non-clinical
- Never ask two questions in one message
- Tailor ALL recommendations to combine data signals + their stated behaviors

Conversation turn count: {turn_count}
If turn_count > 10, reduce follow-up questions to only when very relevant.
"""
````

### agents/state.py — updated
```python
class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    session_id: str
    onboarding_complete: bool
    psychological_profile: dict
    turn_count: int
```

### agents/graph.py — updated nodes
```python
# Add new node: check_onboarding
# Before call_model, route to onboarding prompt or coaching prompt based on state
# After each model response, increment turn_count in state
# Extract and store psychological_profile updates from onboarding responses

def route_prompt(state: AgentState):
    if not state["onboarding_complete"]:
        return "onboarding_node"
    return "call_model"

# onboarding_node: uses ONBOARDING_SYSTEM_PROMPT, 
# detects when all 4 questions answered, flips onboarding_complete=True,
# saves profile to DB
```

### New tool in tools/bias_tools.py
```python
def update_psychological_profile(session_id: str, profile_update: str) -> str:
    # profile_update is JSON string with fields to merge into existing profile
    # saves to DB, returns "Profile updated"

def get_psychological_profile(session_id: str) -> str:
    # returns stored profile as JSON string
```

### New API endpoint in main.py
```python
@app.get("/session/{session_id}/onboarding_status")
# returns { onboarding_complete: bool, turn_count: int }
# frontend uses this to show onboarding progress UI
```
````

---

