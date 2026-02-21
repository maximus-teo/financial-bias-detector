import sqlite3

conn = sqlite3.connect('trading_session.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
print("Tables:", cursor.fetchall())

# Check for a messages table or similar
cursor.execute("PRAGMA table_info(trading_sessions)")
print("Columns in trading_sessions:", cursor.fetchall())

conn.close()
