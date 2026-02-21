import sqlite3
import json

conn = sqlite3.connect('trading_session.db')
cursor = conn.cursor()

cursor.execute("SELECT id, psychological_profile, onboarding_complete, chat_turn_count FROM trading_sessions ORDER BY created_at DESC LIMIT 1")
row = cursor.fetchone()

if row:
    session_id, profile, complete, turns = row
    print(f"Session ID: {session_id}")
    print(f"Onboarding Complete: {complete}")
    print(f"Profile: {profile}")
    print(f"Turns: {turns}")
else:
    print("No sessions found.")

conn.close()
