import json
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text
from database import Base


class TradingSession(Base):
    __tablename__ = "trading_sessions"

    id = Column(String, primary_key=True, index=True)
    filename = Column(String, nullable=True)
    trade_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    report_json = Column(Text, nullable=True)        # cached full report JSON
    trades_json = Column(Text, nullable=True)        # serialized trades DataFrame as JSON records

    # Psychological profile / onboarding
    psychological_profile = Column(Text, nullable=True)   # JSON string
    onboarding_complete = Column(Boolean, default=False)
    chat_turn_count = Column(Integer, default=0)

    def get_psychological_profile(self) -> dict:
        if self.psychological_profile:
            return json.loads(self.psychological_profile)
        return {}

    def set_psychological_profile(self, profile: dict):
        self.psychological_profile = json.dumps(profile)
