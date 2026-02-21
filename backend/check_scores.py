import sqlite3
import json

conn = sqlite3.connect('trading_session.db')
cursor = conn.cursor()

cursor.execute("SELECT report_json FROM trading_sessions ORDER BY created_at DESC LIMIT 1")
row = cursor.fetchone()

if row and row[0]:
    report = json.loads(row[0])
    print("Current Bias Scores:")
    for b in report.get("biases", []):
        print(f"  {b['bias']}: {b['score']} ({b['severity']})")
else:
    print("No report found.")

conn.close()
