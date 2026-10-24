import json
import pytest
from datetime import date, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from backend.database import Base
from backend.models import StudentProfile, Subject, Topic, StudySession
from backend.scheduler import IntelligentScheduler, calculate_priority, calculate_topic_workload, timestr_to_minutes
from backend.demo_data import seed_demo_profiles
from backend.main import app

TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture
def db_session():
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

def create_sample_student(db, daily_avail_hours=3.0, pref_mins=60):
    avail = {
        "Monday": daily_avail_hours, "Tuesday": daily_avail_hours, "Wednesday": daily_avail_hours,
        "Thursday": daily_avail_hours, "Friday": daily_avail_hours, "Saturday": daily_avail_hours, "Sunday": daily_avail_hours
    }
    profile = StudentProfile(
        name="Test Student",
        email="test@vit.ac.in",
        target_exam="VIT Innovate Exam",
        preferred_session_minutes=pref_mins,
        daily_availability_json=json.dumps(avail)
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile

# ==============================================================================
# 14 COMPREHENSIVE AUTOMATED TESTS FOR HACKATHON EVALUATION
# ==============================================================================

# 1. Priority Score Calculation
def test_priority_score_calculation():
    """Verify priority formula incorporating knowledge gap (6 - mastery), importance, deadline, effort."""
    score_a, exp_a, factors_a = calculate_priority(mastery=1, importance=5, days_to_deadline=2, estimated_hours_needed=3.0)
    score_b, exp_b, factors_b = calculate_priority(mastery=5, importance=1, days_to_deadline=20, estimated_hours_needed=1.0)
    
    assert score_a > score_b, "High deficit topic must score higher than mastered topic"
    assert factors_a["knowledge_gap"] == 5  # 6 - 1
    assert factors_b["knowledge_gap"] == 1  # 6 - 5
    assert score_a >= 80.0
    assert score_b <= 35.0

# 2. High-Priority Topic Ordering
def test_high_priority_topic_ordering(db_session):
    """Verify high-priority topics are scheduled before lower-priority topics."""
    profile = create_sample_student(db_session, daily_avail_hours=3.0)
    today = date.today()
    subject = Subject(profile_id=profile.id, name="Algorithms", code="CS201", color="#6366F1", assessment_date=(today + timedelta(days=7)).isoformat())
    db_session.add(subject)
    db_session.commit()

    topic_high = Topic(subject_id=subject.id, name="High Priority Topic", mastery=1, importance=5, estimated_hours_needed=3.0)
    topic_low = Topic(subject_id=subject.id, name="Low Priority Topic", mastery=5, importance=1, estimated_hours_needed=1.0)
    db_session.add_all([topic_high, topic_low])
    db_session.commit()

    scheduler = IntelligentScheduler(db=db_session, profile_id=profile.id)
    scheduler.generate_schedule(start_date=today.isoformat(), horizon_days=7)

    assert topic_high.priority_score > topic_low.priority_score
    sessions = db_session.query(StudySession).filter(StudySession.profile_id == profile.id).all()
    high_sessions = [s for s in sessions if s.topic_id == topic_high.id]
    low_sessions = [s for s in sessions if s.topic_id == topic_low.id]
    assert len(high_sessions) >= len(low_sessions)

# 3. Daily Availability Constraints
def test_daily_availability_constraints(db_session):
    """Hard Constraint Check: Daily scheduled hours must strictly NEVER exceed daily availability."""
    daily_limit = 2.5  # 150 mins
    profile = create_sample_student(db_session, daily_avail_hours=daily_limit, pref_mins=45)
    today = date.today()
    subject = Subject(profile_id=profile.id, name="Systems", code="CS202", color="#6366F1", assessment_date=(today + timedelta(days=6)).isoformat())
    db_session.add(subject)
    db_session.commit()

    for i in range(1, 5):
        db_session.add(Topic(subject_id=subject.id, name=f"Heavy Topic {i}", mastery=1, importance=5, estimated_hours_needed=4.0))
    db_session.commit()

    scheduler = IntelligentScheduler(db=db_session, profile_id=profile.id)
    result = scheduler.generate_schedule(start_date=today.isoformat(), horizon_days=7)
    assert result["success"] is True

    sessions = db_session.query(StudySession).filter(StudySession.profile_id == profile.id).all()
    day_map = {}
    for s in sessions:
        day_map[s.date] = day_map.get(s.date, 0) + s.duration_minutes

    max_allowed = int(daily_limit * 60)
    for d, mins in day_map.items():
        assert mins <= max_allowed, f"Day {d} exceeded daily availability: {mins} > {max_allowed}"

# 4. Weekly Availability Constraints
def test_weekly_availability_constraints(db_session):
    """Hard Constraint Check: Total weekly scheduled hours must never exceed total weekly available hours."""
    daily_hours = 2.0  # 14 hours / week
    profile = create_sample_student(db_session, daily_avail_hours=daily_hours, pref_mins=60)
    today = date.today()
    subject = Subject(profile_id=profile.id, name="Math", code="MA101", color="#8B5CF6", assessment_date=(today + timedelta(days=7)).isoformat())
    db_session.add(subject)
    db_session.commit()

    for i in range(1, 4):
        db_session.add(Topic(subject_id=subject.id, name=f"Topic {i}", mastery=2, importance=4, estimated_hours_needed=5.0))
    db_session.commit()

    scheduler = IntelligentScheduler(db=db_session, profile_id=profile.id)
    result = scheduler.generate_schedule(start_date=today.isoformat(), horizon_days=7)

    summary = result["summary"]
    assert summary["allocated_hours"] <= summary["total_available_hours"], "Allocated weekly hours exceeded total availability"

# 5. Examination Deadline Restrictions
def test_examination_deadline_restrictions(db_session):
    """Hard Constraint Check: Zero sessions scheduled after the assessment deadline."""
    profile = create_sample_student(db_session, daily_avail_hours=4.0)
    today = date.today()
    deadline = today + timedelta(days=3)  # Exam in 3 days

    subject = Subject(profile_id=profile.id, name="OS", code="CS301", color="#10B981", assessment_date=deadline.isoformat())
    db_session.add(subject)
    db_session.commit()

    t1 = Topic(subject_id=subject.id, name="Virtual Memory", mastery=2, importance=5)
    db_session.add(t1)
    db_session.commit()

    scheduler = IntelligentScheduler(db=db_session, profile_id=profile.id)
    scheduler.generate_schedule(start_date=today.isoformat(), horizon_days=10)

    sessions = db_session.query(StudySession).filter(StudySession.profile_id == profile.id).all()
    assert len(sessions) > 0
    for s in sessions:
        s_date = date.fromisoformat(s.date)
        assert s_date <= deadline, f"Session {s.title} scheduled on {s.date} after deadline {deadline}"

# 6. No Overlapping Sessions
def test_no_overlapping_sessions(db_session):
    """Hard Invariant Check: On any day, no two study sessions overlap in time."""
    profile = create_sample_student(db_session, daily_avail_hours=4.0, pref_mins=45)
    today = date.today()
    subject = Subject(profile_id=profile.id, name="Networks", code="CS302", color="#06B6D4", assessment_date=(today + timedelta(days=5)).isoformat())
    db_session.add(subject)
    db_session.commit()

    for i in range(3):
        db_session.add(Topic(subject_id=subject.id, name=f"Net Topic {i+1}", mastery=2, importance=4))
    db_session.commit()

    scheduler = IntelligentScheduler(db=db_session, profile_id=profile.id)
    scheduler.generate_schedule(start_date=today.isoformat(), horizon_days=5)

    sessions = db_session.query(StudySession).filter(StudySession.profile_id == profile.id).all()
    # Group by date
    by_date = {}
    for s in sessions:
        by_date.setdefault(s.date, []).append((timestr_to_minutes(s.start_time), timestr_to_minutes(s.end_time), s.title))

    for d, intervals in by_date.items():
        intervals.sort(key=lambda x: x[0])
        for i in range(len(intervals) - 1):
            curr_end = intervals[i][1]
            next_start = intervals[i + 1][0]
            assert curr_end <= next_start, f"Overlapping sessions on {d}: {intervals[i]} and {intervals[i+1]}"

# 7. Dynamic Rescheduling
def test_dynamic_rescheduling(db_session):
    """Dynamic Rescheduling Invariant: Updating topic mastery or session status recalculates remaining sessions."""
    profile = create_sample_student(db_session, daily_avail_hours=3.0)
    today = date.today()
    subject = Subject(profile_id=profile.id, name="AI", code="AI101", color="#8B5CF6", assessment_date=(today + timedelta(days=6)).isoformat())
    db_session.add(subject)
    db_session.commit()

    topic = Topic(subject_id=subject.id, name="Neural Nets", mastery=1, importance=5)
    db_session.add(topic)
    db_session.commit()

    scheduler = IntelligentScheduler(db=db_session, profile_id=profile.id)
    scheduler.generate_schedule(start_date=today.isoformat(), horizon_days=7)

    initial_score = topic.priority_score

    # Student updates mastery from 1 to 4
    topic.mastery = 4
    db_session.commit()

    resched = scheduler.generate_schedule(start_date=today.isoformat(), horizon_days=7, preserve_completed=True)
    assert resched["success"] is True
    assert topic.priority_score < initial_score, "Priority score should decrease when mastery increases"

# 8. Preservation of Completed Sessions
def test_preservation_of_completed_sessions(db_session):
    """History Invariant: Marked completed sessions remain locked and preserved with notes & timestamps."""
    profile = create_sample_student(db_session, daily_avail_hours=3.0)
    today = date.today()
    subject = Subject(profile_id=profile.id, name="DBMS", code="CS401", color="#3B82F6", assessment_date=(today + timedelta(days=6)).isoformat())
    db_session.add(subject)
    db_session.commit()

    t1 = Topic(subject_id=subject.id, name="SQL Indexing", mastery=2, importance=4)
    db_session.add(t1)
    db_session.commit()

    scheduler = IntelligentScheduler(db=db_session, profile_id=profile.id)
    scheduler.generate_schedule(start_date=today.isoformat(), horizon_days=7)

    initial_sessions = db_session.query(StudySession).filter(StudySession.profile_id == profile.id).all()
    first_session = initial_sessions[0]
    first_id = first_session.id
    first_session.is_completed = True
    first_session.status = "completed"
    first_session.notes = "Completed practice problems 1 to 10"
    db_session.commit()

    scheduler.generate_schedule(start_date=today.isoformat(), horizon_days=7, preserve_completed=True)

    preserved = db_session.query(StudySession).filter(StudySession.id == first_id).first()
    assert preserved is not None
    assert preserved.is_completed is True
    assert preserved.notes == "Completed practice problems 1 to 10"

# 9. Infeasible Schedule Handling
def test_infeasible_schedule_handling(db_session):
    """Capacity Deficit Check: Extremely constrained hours trigger clear warnings and safe prioritization."""
    profile = create_sample_student(db_session, daily_avail_hours=0.5, pref_mins=30)  # Only 30m/day
    today = date.today()
    subject = Subject(profile_id=profile.id, name="Massive Curriculum", code="CS999", color="#EC4899", assessment_date=(today + timedelta(days=5)).isoformat())
    db_session.add(subject)
    db_session.commit()

    for i in range(5):
        db_session.add(Topic(subject_id=subject.id, name=f"Big Topic {i+1}", mastery=1, importance=5, estimated_hours_needed=5.0))
    db_session.commit()

    scheduler = IntelligentScheduler(db=db_session, profile_id=profile.id)
    result = scheduler.generate_schedule(start_date=today.isoformat(), horizon_days=5)

    assert result["success"] is True
    assert result["summary"]["has_capacity_deficit"] is True
    assert result["summary"]["deficit_warning"] is not None
    assert result["summary"]["capacity_deficit_hours"] > 0
    assert result["summary"]["allocated_hours"] <= result["summary"]["total_available_hours"]

# 10. Empty Profiles
def test_empty_profiles(db_session):
    """Graceful Handling: Empty profile without subjects returns structured failure without crashing."""
    profile = create_sample_student(db_session)
    scheduler = IntelligentScheduler(db=db_session, profile_id=profile.id)
    result = scheduler.generate_schedule()
    assert result["success"] is False
    assert "No subjects found" in result["message"]
    assert result["sessions"] == []

# 11. Invalid Dates and Mastery Values
def test_invalid_dates_and_mastery_values():
    """Boundary Check: Values out of bounds are clamped safely."""
    # Mastery 0 clamped to 1, mastery 10 clamped to 5
    score_low, _, f_low = calculate_priority(mastery=0, importance=6, days_to_deadline=-5)
    score_high, _, f_high = calculate_priority(mastery=10, importance=-2, days_to_deadline=50)

    assert f_low["mastery"] == 1
    assert f_low["importance"] == 5
    assert f_high["mastery"] == 5
    assert f_high["importance"] == 1
    assert 0.0 <= score_low <= 100.0
    assert 0.0 <= score_high <= 100.0

# 12. Three Different Demo Profiles
def test_three_demo_profiles(db_session):
    """Multi-Persona Validation: Beginner, Intermediate, and Advanced each produce valid schedules."""
    seed_demo_profiles(db_session)
    profiles = db_session.query(StudentProfile).all()
    assert len(profiles) >= 3

    for p in profiles[:3]:
        scheduler = IntelligentScheduler(db=db_session, profile_id=p.id)
        res = scheduler.generate_schedule(horizon_days=7)
        assert res["success"] is True
        assert len(res["sessions"]) > 0
        assert res["summary"]["allocated_hours"] <= res["summary"]["total_available_hours"]

# 13. Database Persistence
def test_database_persistence(db_session):
    """Persistence Verification: CRUD lifecycle persists correctly in SQLite."""
    profile = create_sample_student(db_session)
    subject = Subject(profile_id=profile.id, name="Cloud Computing", code="CS501", color="#4F46E5", assessment_date="2026-11-15")
    db_session.add(subject)
    db_session.commit()
    db_session.refresh(subject)

    topic = Topic(subject_id=subject.id, name="Kubernetes Pods", mastery=2, importance=4, estimated_hours_needed=3.0)
    db_session.add(topic)
    db_session.commit()
    db_session.refresh(topic)

    retrieved = db_session.query(Topic).filter(Topic.id == topic.id).first()
    assert retrieved is not None
    assert retrieved.name == "Kubernetes Pods"
    assert retrieved.mastery == 2
    assert retrieved.subject.code == "CS501"

# 14. API Error Handling
def test_api_error_handling():
    """API Robustness Check: Proper 404 and 400 responses returned on invalid inputs."""
    client = TestClient(app)
    # 404 for non-existent profile
    r_404 = client.get("/api/profiles/999999")
    assert r_404.status_code == 404

    # 404 for non-existent session update
    r_sess_404 = client.put("/api/sessions/999999", json={"is_completed": True})
    assert r_sess_404.status_code == 404

    # 400 for topic creation without subject_id
    r_bad = client.post("/api/topics", json={"name": "Orphan Topic", "mastery": 3, "importance": 3})
    assert r_bad.status_code in [400, 422]
