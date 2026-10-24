import os
import sqlite3

db_path = os.path.join(os.path.dirname(__file__), "studysync.db")
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(study_sessions)")
    cols = [r[1] for r in cur.fetchall()]
    if "is_missed" not in cols:
        cur.execute("ALTER TABLE study_sessions ADD COLUMN is_missed BOOLEAN DEFAULT 0")
        print("Added is_missed column")
    if "status" not in cols:
        cur.execute("ALTER TABLE study_sessions ADD COLUMN status VARCHAR(30) DEFAULT 'pending'")
        print("Added status column")
    conn.commit()
    conn.close()
    print("Database columns migrated successfully!")
