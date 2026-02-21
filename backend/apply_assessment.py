import sqlite3
import json

conn = sqlite3.connect('trading_session.db')
cursor = conn.cursor()

# Get latest session
cursor.execute("SELECT id, psychological_profile, report_json FROM trading_sessions ORDER BY created_at DESC LIMIT 1")
row = cursor.fetchone()

if row and row[2]:
    session_id, profile_json, report_json = row
    profile = json.loads(profile_json)
    report = json.loads(report_json)
    
    # Simple assessment logic based on the profile fields we saw
    # If they admit to aggressive sizing, we bump revenge trading
    if profile.get('aggressive_position_sizing') is True:
        for b in report.get('biases', []):
            if b['bias'] == 'revenge_trading':
                b['score'] = 0.75
                b['severity'] = 'High'
                print("Adjusted revenge_trading to 0.75 based on aggressive position sizing admission.")
    
    # Save back
    cursor.execute("UPDATE trading_sessions SET report_json = ? WHERE id = ?", (json.dumps(report), session_id))
    conn.commit()
    print("Dashboard cards updated.")
else:
    print("Nothing to update.")

conn.close()
