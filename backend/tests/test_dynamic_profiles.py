import json
import pytest
from datetime import date, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from backend.database import Base, get_db
from backend.models import StudentProfile, Subject, Topic, StudySession
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
    
    # Pre-seed demo profiles to match production initial state
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


def test_create_dynamic_profile_api(test_app):
    client, SessionLocal = test_app

    # Verify initial demo personas exist
    resp = client.get("/api/profiles")
    assert resp.status_code == 200
    initial_profiles = resp.json()
    assert len(initial_profiles) == 3
    demo_names = [p["name"] for p in initial_profiles]
    assert "Govind Innani" in demo_names
    assert "Lakshy Kesharwani" in demo_names
    assert "Adhiranshu Singh" in demo_names

    # Create a new dynamic student profile
    new_profile_payload = {
        "name": "Priya Sharma",
        "email": "priya.sharma@vit.ac.in",
        "target_exam": "GATE CS 2027",
        "preferred_session_minutes": 45,
        "daily_availability_json": json.dumps({
            "Monday": 4.0, "Tuesday": 4.0, "Wednesday": 4.0,
            "Thursday": 4.0, "Friday": 4.0, "Saturday": 6.0, "Sunday": 6.0
        })
    }

    create_resp = client.post("/api/profiles", json=new_profile_payload)
    assert create_resp.status_code == 201
    created_data = create_resp.json()
    assert created_data["id"] > 3
    assert created_data["name"] == "Priya Sharma"
    assert created_data["preferred_session_minutes"] == 45
    assert created_data["target_exam"] == "GATE CS 2027"

    # Verify profiles list has updated to 4
    list_resp = client.get("/api/profiles")
    assert len(list_resp.json()) == 4


def test_independent_curriculum_and_scheduling(test_app):
    client, SessionLocal = test_app

    # Create dynamic profile
    new_profile_payload = {
        "name": "Vikram Patel",
        "target_exam": "Civil Services Prelims 2026",
        "preferred_session_minutes": 60,
    }
    create_resp = client.post("/api/profiles", json=new_profile_payload)
    assert create_resp.status_code == 201
    v_id = create_resp.json()["id"]

    # Add custom subject for Vikram
    today = date.today()
    subject_resp = client.post("/api/subjects", json={
        "profile_id": v_id,
        "name": "Indian Polity",
        "code": "POL201",
        "color": "#10B981",
        "assessment_date": (today + timedelta(days=10)).isoformat()
    })
    assert subject_resp.status_code == 200
    subject_id = subject_resp.json()["id"]

    # Add custom topics
    t1_resp = client.post("/api/topics", json={
        "subject_id": subject_id,
        "name": "Constitutional Framework",
        "current_mastery": 20,
        "target_mastery": 80,
        "difficulty": 5,
        "estimated_hours_needed": 2.0,
        "is_revision": False
    })
    assert t1_resp.status_code == 200

    # Generate personalized schedule for Vikram
    sched_resp = client.post("/api/schedule/generate", json={"profile_id": v_id, "horizon_days": 7})
    assert sched_resp.status_code == 200
    sched_data = sched_resp.json()
    assert sched_data["success"] is True
    assert len(sched_data["sessions"]) > 0
    assert all(s["profile_id"] == v_id for s in sched_data["sessions"])

    # Verify Govind (profile 1) sessions were NOT overwritten or mixed
    govind_sessions = client.get("/api/sessions?profile_id=1").json()
    for s in govind_sessions:
        assert s["profile_id"] == 1
        assert s["subject_name"] != "Indian Polity"


def test_independent_session_progress_tracking(test_app):
    client, SessionLocal = test_app

    # Create student
    res = client.post("/api/profiles", json={"name": "Aarav Mehta"})
    aarav_id = res.json()["id"]

    # Add subject and topic
    sub = client.post("/api/subjects", json={
        "profile_id": aarav_id,
        "name": "Robotics",
        "code": "ROB101",
        "color": "#8B5CF6",
        "assessment_date": (date.today() + timedelta(days=8)).isoformat()
    }).json()

    client.post("/api/topics", json={
        "subject_id": sub["id"],
        "name": "Kinematics",
        "current_mastery": 10,
        "target_mastery": 90,
        "difficulty": 8,
        "estimated_hours_needed": 2.0,
        "is_revision": False
    })

    # Generate schedule
    sched = client.post("/api/schedule/generate", json={"profile_id": aarav_id, "horizon_days": 7}).json()
    aarav_sessions = sched["sessions"]
    assert len(aarav_sessions) > 0

    first_sess_id = aarav_sessions[0]["id"]
    # Mark session completed
    up_resp = client.put(f"/api/sessions/{first_sess_id}", json={"is_completed": True, "status": "completed"})
    assert up_resp.status_code == 200

    # Check analytics for Aarav
    analytics_aarav = client.get(f"/api/analytics/{aarav_id}").json()
    assert analytics_aarav["summary"]["completed_sessions"] == 1

    # Check analytics for Govind (profile 1) - unaffected
    analytics_govind = client.get("/api/analytics/1").json()
    assert analytics_govind["summary"]["completed_sessions"] == 0


def test_edit_and_delete_profile_cascade(test_app):
    client, SessionLocal = test_app

    # Create student
    res = client.post("/api/profiles", json={
        "name": "Rohit Verma",
        "target_exam": "GRE 2026"
    })
    rohit_id = res.json()["id"]

    # Edit student profile
    edit_resp = client.put(f"/api/profiles/{rohit_id}", json={
        "name": "Rohit Verma (Updated)",
        "target_exam": "GRE & TOEFL 2026",
        "preferred_session_minutes": 90
    })
    assert edit_resp.status_code == 200
    assert edit_resp.json()["name"] == "Rohit Verma (Updated)"
    assert edit_resp.json()["preferred_session_minutes"] == 90

    # Add subject and session
    sub = client.post("/api/subjects", json={
        "profile_id": rohit_id,
        "name": "GRE Verbal",
        "code": "GRE101",
        "color": "#EF4444",
        "assessment_date": (date.today() + timedelta(days=14)).isoformat()
    }).json()

    client.post("/api/topics", json={
        "subject_id": sub["id"],
        "name": "Vocabulary",
        "current_mastery": 50,
        "target_mastery": 95,
        "difficulty": 6,
        "estimated_hours_needed": 2.0
    })

    sched = client.post("/api/schedule/generate", json={"profile_id": rohit_id, "horizon_days": 7}).json()
    assert len(sched["sessions"]) > 0

    # Verify DB has Rohit's subjects and sessions
    db = SessionLocal()
    rohit_subs = db.query(Subject).filter(Subject.profile_id == rohit_id).all()
    rohit_sess = db.query(StudySession).filter(StudySession.profile_id == rohit_id).all()
    assert len(rohit_subs) == 1
    assert len(rohit_sess) > 0
    db.close()

    # Delete profile
    del_resp = client.delete(f"/api/profiles/{rohit_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["success"] is True

    # Verify cascade deletion from DB
    db = SessionLocal()
    assert db.query(StudentProfile).filter(StudentProfile.id == rohit_id).first() is None
    assert db.query(Subject).filter(Subject.profile_id == rohit_id).count() == 0
    assert db.query(StudySession).filter(StudySession.profile_id == rohit_id).count() == 0
    
    # Original 3 demo personas must still be completely intact
    assert db.query(StudentProfile).count() == 3
    db.close()


def test_delete_last_profile_prevention(test_app):
    client, SessionLocal = test_app

    # Try deleting profiles until 1 remains
    profiles = client.get("/api/profiles").json()
    for p in profiles[1:]:
        client.delete(f"/api/profiles/{p['id']}")

    remaining = client.get("/api/profiles").json()
    assert len(remaining) == 1
    last_id = remaining[0]["id"]

    # Deleting the last profile must fail with 400 Bad Request
    fail_del = client.delete(f"/api/profiles/{last_id}")
    assert fail_del.status_code == 400
    assert "Cannot delete the only remaining profile" in fail_del.json()["detail"]


def test_profile_validation_errors(test_app):
    client, SessionLocal = test_app

    # Name is whitespace or missing
    empty_resp = client.post("/api/profiles", json={"name": "   "})
    assert empty_resp.status_code == 400

    # Nonexistent profile deletion
    not_found_del = client.delete("/api/profiles/99999")
    assert not_found_del.status_code == 404
