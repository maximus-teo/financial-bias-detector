import os
import uuid
import json
import logging
from datetime import datetime
from typing import List

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from dotenv import load_dotenv

load_dotenv()

from database import get_db, init_db
from models.db_models import TradingSession
from models.schemas import (
    UploadResponse,
    ManualUploadRequest,
    ChatRequest,
    ChatResponse,
    OnboardingStatus,
    FullReport,
)
from storage.file_handler import parse_csv_upload, parse_json_upload, parse_manual_trades
from analysis.aggregator import run_full_analysis
from agents.graph import run_agent

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Financial Bias Detector API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    init_db()
    os.makedirs(os.getenv("UPLOAD_DIR", "uploads"), exist_ok=True)
    logger.info("Database initialized and upload directory ready.")


# ── Upload endpoints ──────────────────────────────────────────────────────────

@app.post("/upload", response_model=UploadResponse)
async def upload_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not (file.filename.endswith(".csv") or file.filename.endswith(".json")):
        raise HTTPException(status_code=400, detail="Only CSV or JSON files are accepted.")

    session_id = str(uuid.uuid4())
    content = await file.read()

    try:
        if file.filename.endswith(".csv"):
            df, trades_json = parse_csv_upload(content)
        else:
            df, trades_json = parse_json_upload(content)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"File parse error: {str(e)}")

    # No capped sampling; process full dataset for analysis
    # trades_json already contains the full dataset from parse_csv_upload/parse_json_upload

    session = TradingSession(
        id=session_id,
        filename=file.filename,
        trade_count=len(df),
        trades_json=trades_json,
    )
    db.add(session)
    db.commit()

    return UploadResponse(
        session_id=session_id,
        trade_count=len(df),
        filename=file.filename,
    )


@app.post("/upload/manual", response_model=UploadResponse)
async def upload_manual(request: ManualUploadRequest, db: Session = Depends(get_db)):
    session_id = request.session_id or str(uuid.uuid4())

    try:
        df, trades_json = parse_manual_trades(request.trades)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Trade parse error: {str(e)}")

    existing = db.query(TradingSession).filter(TradingSession.id == session_id).first()
    if existing:
        existing.trades_json = trades_json
        existing.trade_count = len(df)
        db.commit()
    else:
        session = TradingSession(
            id=session_id,
            filename="manual_entry",
            trade_count=len(df),
            trades_json=trades_json,
        )
        db.add(session)
        db.commit()

    return UploadResponse(
        session_id=session_id,
        trade_count=len(df),
        filename="manual_entry",
    )


# ── Analysis endpoints ────────────────────────────────────────────────────────

@app.post("/analyze/{session_id}")
async def analyze_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(TradingSession).filter(TradingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    if not session.trades_json:
        raise HTTPException(status_code=400, detail="No trades loaded for this session.")

    import pandas as pd
    import io
    df = pd.read_json(io.StringIO(session.trades_json), orient="records")
    df["timestamp"] = pd.to_datetime(df["timestamp"])

    try:
        report = run_full_analysis(df, session_id)
    except Exception as e:
        logger.error(f"Analysis error for session {session_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

    session.report_json = json.dumps(report)
    db.commit()

    return report


@app.get("/report/{session_id}")
async def get_report(session_id: str, db: Session = Depends(get_db)):
    session = db.query(TradingSession).filter(TradingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    if not session.report_json:
        raise HTTPException(status_code=404, detail="No report generated yet. Call POST /analyze/{session_id} first.")

    return json.loads(session.report_json)


# ── Chat endpoint ─────────────────────────────────────────────────────────────

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    session = db.query(TradingSession).filter(TradingSession.id == request.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    history = [{"role": m.role, "content": m.content} for m in (request.history or [])]

    try:
        response_text, updated_session = await run_agent(
            session_id=request.session_id,
            message=request.message,
            history=history,
            db=db,
        )
    except Exception as e:
        logger.error(f"Agent error for session {request.session_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")

    return ChatResponse(
        response=response_text,
        onboarding_complete=updated_session.onboarding_complete,
        turn_count=updated_session.chat_turn_count,
        updated_report=json.loads(updated_session.report_json) if updated_session.report_json else None,
    )


# ── Onboarding status ─────────────────────────────────────────────────────────

@app.get("/session/{session_id}/onboarding_status", response_model=OnboardingStatus)
async def get_onboarding_status(session_id: str, db: Session = Depends(get_db)):
    session = db.query(TradingSession).filter(TradingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    return OnboardingStatus(
        onboarding_complete=session.onboarding_complete,
        turn_count=session.chat_turn_count,
        psychological_profile=session.get_psychological_profile() or None,
    )


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}
