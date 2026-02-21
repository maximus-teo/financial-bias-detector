# National Bank of Canada - Trading Psychology Bias Detector

This project is a full-stack proof-of-concept for detecting cognitive biases in trading behavior, built for the NBC hackathon. It combines quantitative data analysis with a qualitative LLM-powered psychology coach (powered by Cerebras + LangGraph) to identify hidden trading flaws.

## Features

- **Upload parsing**: Parses CSV trade data or accepts manual trade entry
- **Data analysis**: Vectorized pandas operations to detect 4 major cognitive biases:
  - **Overtrading**: trading too frequently, rapid succession, post-event noise
  - **Loss Aversion**: holding losers too long, cutting winners too early, unfavorable R/R ratios
  - **Revenge Trading**: escalating position sizing after losses, active drawdown trading
  - **Anchoring (bonus)**: holding trades purely based on proximity to entry price and round numbers
- **LangGraph Agent Coach**: 
  - Starts in an **Onboarding Mode** to assess your psychological profile with key questions
  - Transitions to a **Coaching Mode** to answer user queries using both hard data (from the bias analysis tools) and your stated behavioral profile
- **React Dashboard**: An NBC-themed, dark-mode dashboard showing:
  - Risk Profile Banner
  - Interactive Bias Score Cards
  - 5 Chart Types: Cumulative P&L Timeline, Win/Loss Distribution Bar, Bias Radar Chart, Trading Heatmap (Hour × Day), and Drawdown Area Chart
  - Slide-out Glass-morphism Chat Panel

## Architecture Stack

### Backend
- **FastAPI**: API routes + endpoints
- **pandas**: Used for fast, vectorized statistical detection of trades
- **LangGraph + Cerebras**: ReAct loop for the AI coach, tools mapping, and session memory
- **SQLAlchemy/SQLite**: Preserves conversational state, onboarding profile, and parsed trade history

### Frontend
- **React + Vite**
- **Tailwind CSS**: Styling, using custom NBC design tokens (`var(--nbc-red)`, etc.)
- **Zustand**: Client-side state management (handles session info)
- **Recharts**: Data visualization
- **Framer Motion**: Smooth entry, exit, and transition animations

## How to Run Locally

### 1. Backend Setup

1. Open a terminal and navigate to the project directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment (recommended):
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up environment variables:
   Copy `.env.example` to `.env` and configure your `CEREBRAS_API_KEY`:
   ```bash
   cp .env.example .env
   # Edit .env and set your CEREBRAS_API_KEY
   ```
5. Run the FastAPI development server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   *The backend runs on `http://localhost:8000`.*

### 2. Frontend Setup

1. Open a second terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend runs on `http://localhost:5173`.*

## How to Use

1. **Visit** `http://localhost:5173` in your browser.
2. **Upload** the provided `sample_trades.csv` file (located in the root directory) or manually enter typical trades.
3. Once analyzed, you'll be taken to the **Dashboard** displaying the risk profile and interactive charts.
4. Click on **"💬 Ask NBC Coach"** in the top right. 
5. The Coach will enter **Onboarding Mode**. Answer the 4 initial questions to help build your psychological profile.
6. Once complete, you can ask the Coach data-specific questions like *"Why is my revenge trading score so high?"* or *"What can I do to fix my loss aversion?"*, and it will use real data references + your profile to advise you.
