import sqlite3
import json

conn = sqlite3.connect('trading_session.db')
cursor = conn.cursor()

# Get latest session
cursor.execute("SELECT id, report_json FROM trading_sessions ORDER BY created_at DESC LIMIT 1")
row = cursor.fetchone()

if row and row[1]:
    session_id, report_json = row
    report = json.loads(report_json)
    
    # Admitted bias: Revenge trading is very high because user gets mad and is revenge trading.
    # User specifically asked for it to adjust the revenge score.
    for b in report.get('biases', []):
        if b['bias'] == 'revenge_trading':
            b['score'] = 0.95
            b['severity'] = 'High'
            print("Adjusted revenge_trading to 0.95 (High) per user request.")
    
    # Recalculate overall risk score
    scores = [b['score'] for b in report.get('biases', [])]
    report['overall_risk_score'] = round(sum(scores) / len(scores), 2) if scores else 0.0
    
    # Save back
    cursor.execute("UPDATE trading_sessions SET report_json = ? WHERE id = ?", (json.dumps(report), session_id))
    conn.commit()
    print("Dashboard cards updated with requested scores.")
else:
    print("Nothing to update.")

conn.close()
