# System Architecture Diagram

This document provides a visual representation of how the Financial Bias Detector handles data and coordinates between the statistical engines and the AI Coach.

## High-Level Architecture

```mermaid
graph TD
    subgraph Frontend [React Landing / Dashboard]
        UI[User Dashboard]
        Chat[AI Coach Panel]
        Zustand[(Session Store)]
    end

    subgraph Backend [FastAPI Orchestrator]
        FH[File Handler]
        AG[Aggregator]
        DB[(SQLite DB)]
        ML[ML Scoring - Random Forest]
    end

    subgraph Analysis_Engine [Behavioral Analysis Engine]
        OT[Overtrading Detector]
        RT[Revenge Trading Detector]
        LA[Loss Aversion Detector]
        AN[Anchoring Detector]
    end

    subgraph Agentic_Layer [LangGraph Agent Brain]
        State[Conversation State]
        Cerebras[Cerebras Llama 3.1 SDK]
        Tools[Bias Tools]
    end

    %% Data Flow
    UI -- "1. Upload CSV" --> FH
    FH -- "2. Vectorized DataFrame" --> AG
    AG -- "3. Parallel Execution" --> Analysis_Engine
    AG -- "4. Feature Extraction" --> ML
    ML -- "5. Scored Report JSON" --> DB
    
    %% Communication Flow
    Chat -- "6. Turn-based Query" --> Agentic_Layer
    Agentic_Layer -- "7. Decision Logics/Tool Call" --> Tools
    Tools -- "8. Read/Write Report" --> DB
    DB -- "9. Real-time Refresh" --> UI
```

## Component Breakdown

### 1. The Behavioral Pipeline
- **Vectorized Math**: Every bias detector (Overtrading, Revenge, etc.) runs on raw trade columns simultaneously.
- **Random Forest Regressor**: Provides the ML "Validation" score by analyzing complex trade feature interactions that simple IF/ELSE rules might miss.

### 2. The AI Coach (LangGraph)
- **Stateful Memory**: The agent remembers your onboarding answers and uses them to frame its coaching advice.
- **Tool-Calling Capability**: The agent can manually trigger dashboard updates via the `adjust_bias_scores` tool, making the dashboard a "living" document of your psychological progress.

### 3. Data Flow Persistence
- **SQLite**: Stores every trade, session, and generated report locally to ensure no loss of analysis history.
- **FastAPI**: Provides high-speed streaming of large trade datasets (200k+ rows) to the frontend charts.
