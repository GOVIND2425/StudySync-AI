import json
import pytest
from datetime import date, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from backend.database import Base, get_db
from backend.models import StudentProfile, Subject, Topic, StudySession, ManualTask
from backend.main import app
from backend.demo_data import seed_demo_profiles
from backend.scheduler import IntelligentScheduler

@pytest.fixture
def test_app():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    
    # Pre-seed demo profiles
    db = TestingSessionLocal()
    seed_demo_profiles(db)
    db.close()

    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    
    yield client, TestingSessionLocal
    
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


def test_manual_task_crud_lifecycle(test_app):
    """Test full CRUD lifecycle for manual tasks: create, read, update, delete."""
    client, SessionLocal = test_app
    today_str = date.today().isoformat()

    # 1. Create a manual study task
    create_payload = {
        "profile_id": 1,
        "title": "Complete Math Homework Assignment 4",
        "description": "Solve calculus problems 1 to 20 from chapter 5",
        "category": "assignment",
        "date": today_str,
        "start_time": "14:00",
        "duration_minutes": 90,
        "priority": "high",
        "notes": "Verify formulas before submitting"
    }
    resp = client.post("/api/manual-tasks", json=create_payload)
    assert resp.status_code == 201, resp.text
    task_data = resp.json()
    assert task_data["id"] is not None
    assert task_data["title"] == "Complete Math Homework Assignment 4"
    assert task_data["category"] == "assignment"
    assert task_data["priority"] == "high"
    assert task_data["start_time"] == "14:00"
    assert task_data["end_time"] == "15:30"
    assert task_data["duration_minutes"] == 90
    assert task_data["source"] == "manual"
    assert task_data["is_completed"] is False
    assert task_data["status"] == "pending"
    task_id = task_data["id"]

    # 2. Query manual tasks for profile 1
    resp = client.get(f"/api/manual-tasks?profile_id=1")
    assert resp.status_code == 200
    tasks = resp.json()
    assert any(t["id"] == task_id for t in tasks)

    # 3. Update task (title, mark completed)
    update_payload = {
        "title": "Complete Math Homework Assignment 4 (Done)",
        "is_completed": True
    }
    resp = client.put(f"/api/manual-tasks/{task_id}", json=update_payload)
    assert resp.status_code == 200
    updated_data = resp.json()
    assert updated_data["title"] == "Complete Math Homework Assignment 4 (Done)"
    assert updated_data["is_completed"] is True
    assert updated_data["status"] == "completed"

    # 4. Delete the task
    del_resp = client.delete(f"/api/manual-tasks/{task_id}")
    assert del_resp.status_code == 200

    # 5. Verify deletion
    verify_resp = client.get(f"/api/manual-tasks/{task_id}")
    assert verify_resp.status_code == 404


def test_ai_rescheduling_preserves_manual_tasks(test_app):
    """
    CRITICAL REQUIREMENT:
    Regenerating AI schedule must NEVER delete, overwrite, or mutate user-created manual tasks.
    """
    client, SessionLocal = test_app
    today_str = date.today().isoformat()

    # Create a user manual task
    create_payload = {
        "profile_id": 1,
        "title": "Autonomous Physics Lab Report",
        "category": "assignment",
        "date": today_str,
        "start_time": "16:00",
        "duration_minutes": 60,
        "priority": "critical"
    }
    resp = client.post("/api/manual-tasks", json=create_payload)
    assert resp.status_code == 201
    task_id = resp.json()["id"]

    # Trigger AI schedule regeneration
    regen_resp = client.post("/api/schedule/generate", json={
        "profile_id": 1,
        "start_date": today_str,
        "horizon_days": 7,
        "preserve_completed": True
    })
    assert regen_resp.status_code == 200

    # Verify manual task is intact and unmodified
    task_check = client.get(f"/api/manual-tasks/{task_id}")
    assert task_check.status_code == 200
    data = task_check.json()
    assert data["title"] == "Autonomous Physics Lab Report"
    assert data["category"] == "assignment"
    assert data["priority"] == "critical"
    assert data["start_time"] == "16:00"


def test_scheduler_avoids_clash_with_manual_tasks(test_app):
    """
    Verify that AI scheduler accounts for manual task intervals
    and does not schedule an AI session overlapping the exact same time slot.
    """
    client, SessionLocal = test_app
    today_str = date.today().isoformat()

    # Student available starts at 09:00 AM (540 mins)
    # Create a manual task from 09:00 to 10:30 (90 mins)
    create_payload = {
        "profile_id": 1,
        "title": "Morning Mock Exam",
        "category": "mock_test",
        "date": today_str,
        "start_time": "09:00",
        "duration_minutes": 90,
        "priority": "high"
    }
    resp = client.post("/api/manual-tasks", json=create_payload)
    assert resp.status_code == 201

    # Regenerate AI schedule
    regen_resp = client.post("/api/schedule/generate", json={
        "profile_id": 1,
        "start_date": today_str,
        "horizon_days": 7,
        "preserve_completed": True
    })
    assert regen_resp.status_code == 200
    ai_sessions = regen_resp.json()["sessions"]

    # Find AI sessions scheduled on today
    today_ai = [s for s in ai_sessions if s["date"] == today_str]
    for s in today_ai:
        # No AI session should start before 10:30 if it is placed in the morning block
        s_start = s["start_time"]
        assert not (s_start >= "09:00" and s_start < "10:30"), (
            f"AI session {s['title']} starts at {s_start}, clashing with manual task (09:00-10:30)!"
        )


def test_independent_manual_tasks_per_profile(test_app):
    """Verify that manual tasks for one profile do not leak into another student's calendar."""
    client, SessionLocal = test_app
    today_str = date.today().isoformat()

    # Create task for Govind (profile 1)
    client.post("/api/manual-tasks", json={
        "profile_id": 1,
        "title": "Govind Task",
        "category": "study",
        "date": today_str,
        "start_time": "10:00",
        "duration_minutes": 60
    })

    # Create task for Lakshy (profile 2)
    client.post("/api/manual-tasks", json={
        "profile_id": 2,
        "title": "Lakshy Task",
        "category": "practice",
        "date": today_str,
        "start_time": "11:00",
        "duration_minutes": 45
    })

    # Fetch Govind tasks
    govind_tasks = client.get("/api/manual-tasks?profile_id=1").json()
    assert any(t["title"] == "Govind Task" for t in govind_tasks)
    assert not any(t["title"] == "Lakshy Task" for t in govind_tasks)

    # Fetch Lakshy tasks
    lakshy_tasks = client.get("/api/manual-tasks?profile_id=2").json()
    assert any(t["title"] == "Lakshy Task" for t in lakshy_tasks)
    assert not any(t["title"] == "Govind Task" for t in lakshy_tasks)
