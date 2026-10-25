"""
Database migration script: adds manual_tasks table and is_manual column to study_sessions.
Safe to run multiple times (idempotent). Does NOT modify existing data.
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", "studysync.db")

con = sqlite3.connect(DB_PATH)
cur = con.cursor()

# List existing tables
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in cur.fetchall()]
print("Existing tables:", tables)

# 1. Add is_manual column to study_sessions if missing
cur.execute("PRAGMA table_info(study_sessions)")
session_cols = [r[1] for r in cur.fetchall()]
if "is_manual" not in session_cols:
    cur.execute("ALTER TABLE study_sessions ADD COLUMN is_manual BOOLEAN DEFAULT 0")
    print("Added is_manual column to study_sessions")
else:
    print("is_manual column already exists in study_sessions")

# 2. Create manual_tasks table if it doesn't exist
if "manual_tasks" not in tables:
    cur.execute("""
        CREATE TABLE manual_tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id INTEGER NOT NULL REFERENCES student_profiles(id),
            subject_id INTEGER REFERENCES subjects(id),
            topic_id INTEGER REFERENCES topics(id),
            title VARCHAR(200) NOT NULL,
            description TEXT DEFAULT '',
            category VARCHAR(60) DEFAULT 'study',
            date VARCHAR(30) NOT NULL,
            start_time VARCHAR(20) DEFAULT '09:00',
            end_time VARCHAR(20) DEFAULT '10:00',
            duration_minutes INTEGER DEFAULT 60,
            priority VARCHAR(20) DEFAULT 'medium',
            is_completed BOOLEAN DEFAULT 0,
            is_missed BOOLEAN DEFAULT 0,
            status VARCHAR(30) DEFAULT 'pending',
            completed_at VARCHAR(50),
            notes TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("Created manual_tasks table")
else:
    print("manual_tasks table already exists")

con.commit()
con.close()
print("Migration complete. Database preserved intact.")
