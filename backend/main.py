import os
import json
import subprocess
from datetime import date, timedelta
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import engine, Base, get_db
from .models import StudentProfile, Subject, Topic, StudySession, ManualTask
from .schemas import (
    StudentProfileOut, StudentProfileCreate, StudentProfileUpdate,
    SubjectOut, SubjectCreate, SubjectUpdate,
    TopicOut, TopicCreate, TopicUpdate,
    StudySessionOut, StudySessionCreate, StudySessionUpdate,
    ScheduleGenerationRequest, ScheduleGenerationResponse, ScheduleSummary,
    ManualTaskCreate, ManualTaskUpdate, ManualTaskOut, VALID_CATEGORIES, VALID_PRIORITIES
)
from .scheduler import IntelligentScheduler, parse_iso_date, minutes_to_timestr, timestr_to_minutes
from .demo_data import seed_demo_profiles, reset_demo_profile

# Initialize tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="StudySync AI - Intelligent Personalised Study Planner API",
    description="Algorithmic Study Scheduling, Topic Prioritization, Explainable AI and Spaced Repetition Engine for VIT AI Innovate-A-Thon 2026",
    version="1.0.0"
)

# Configure production CORS
# Supports local dev, custom FRONTEND_URL or ALLOWED_ORIGINS env var, and Vercel preview/production domains
raw_origins = os.environ.get("ALLOWED_ORIGINS") or os.environ.get("FRONTEND_URL") or ""
configured_origins = [orig.strip() for orig in raw_origins.split(",") if orig.strip()]

default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]

allowed_origins = list(set(default_origins + configured_origins))

if "*" in allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_origin_regex=r"^https:\/\/.*\.vercel\.app$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

@app.on_event("startup")
def startup_event():
    db = next(get_db())
    try:
        seed_demo_profiles(db)
    finally:
        db.close()

@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    """
    Application and database readiness probe.
    Verifies service status, database connectivity, and loaded demo personas.
    """
    db_status = "connected"
    profile_count = 0
    db_error = None
    try:
        profile_count = db.query(StudentProfile).count()
    except Exception as e:
        db_status = "error"
        db_error = str(e)

    is_healthy = db_status == "connected" and profile_count > 0

    return {
        "status": "healthy" if is_healthy else "degraded",
        "ready": is_healthy,
        "database": {
            "status": db_status,
            "profiles_loaded": profile_count,
            "error": db_error
        },
        "service": "StudySync AI Scheduling Engine",
        "version": "1.0.0",
        "engine": "Algorithmic Priority & Constrained Multi-Day Knapsack Optimizer",
        "storage": {
            "type": "sqlite",
            "persistence_note": "Ephemeral on Render Free tier; seeded demo data is initialized on startup"
        }
    }

# ----------------- PROFILES -----------------

@app.get("/api/profiles", response_model=List[StudentProfileOut])
def get_profiles(db: Session = Depends(get_db)):
    return db.query(StudentProfile).all()

@app.get("/api/profiles/{profile_id}", response_model=StudentProfileOut)
def get_profile(profile_id: int, db: Session = Depends(get_db)):
    profile = db.query(StudentProfile).filter(StudentProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return profile

@app.put("/api/profiles/{profile_id}", response_model=StudentProfileOut)
def update_profile(profile_id: int, payload: StudentProfileUpdate, db: Session = Depends(get_db)):
    profile = db.query(StudentProfile).filter(StudentProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(profile, key, value)
    
    db.commit()
    db.refresh(profile)
    return profile

@app.post("/api/profiles", response_model=StudentProfileOut, status_code=status.HTTP_201_CREATED)
def create_profile(payload: StudentProfileCreate, db: Session = Depends(get_db)):
    if not payload.name or not payload.name.strip():
        raise HTTPException(status_code=400, detail="Student name is required")
    
    clean_name = payload.name.strip()
    clean_email = payload.email.strip() if payload.email and payload.email.strip() else f"{clean_name.lower().replace(' ', '.')}@student.ac.in"
    
    profile = StudentProfile(
        name=clean_name,
        email=clean_email,
        target_exam=payload.target_exam or "End-Semester Examination",
        preferred_session_minutes=payload.preferred_session_minutes or 60,
        daily_availability_json=payload.daily_availability_json or '{"Monday": 3.0, "Tuesday": 2.5, "Wednesday": 3.0, "Thursday": 2.5, "Friday": 4.0, "Saturday": 5.0, "Sunday": 4.0}'
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile

@app.delete("/api/profiles/{profile_id}")
def delete_profile(profile_id: int, db: Session = Depends(get_db)):
    profile = db.query(StudentProfile).filter(StudentProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    count = db.query(StudentProfile).count()
    if count <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the only remaining profile. At least one profile must exist.")
        
    deleted_name = profile.name
    db.delete(profile)
    db.commit()
    return {"success": True, "message": f"Student profile '{deleted_name}' (ID {profile_id}) deleted successfully"}

@app.post("/api/profiles/{profile_id}/reset")
def reset_profile(profile_id: int, db: Session = Depends(get_db)):
    if profile_id not in [1, 2, 3]:
        raise HTTPException(status_code=400, detail="Only predefined demo profiles (IDs 1, 2, 3) can be reset to demo baseline")
    reset_demo_profile(db, profile_id)
    profile = db.query(StudentProfile).filter(StudentProfile.id == profile_id).first()
    return {"message": f"Profile {profile_id} successfully restored to demo baseline", "profile": profile}

# ----------------- SUBJECTS & TOPICS -----------------

@app.post("/api/subjects", response_model=SubjectOut)
def create_subject(payload: SubjectCreate, db: Session = Depends(get_db)):
    target_profile_id = payload.profile_id or 1
    profile = db.query(StudentProfile).filter(StudentProfile.id == target_profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
    subject = Subject(
        profile_id=target_profile_id,
        name=payload.name,
        code=payload.code,
        color=payload.color,
        assessment_date=payload.assessment_date
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)

    if payload.topics:
        for t in payload.topics:
            topic = Topic(
                subject_id=subject.id,
                name=t.name,
                mastery=t.mastery,
                importance=t.importance,
                estimated_hours_needed=t.estimated_hours_needed or 2.0
            )
            db.add(topic)
        db.commit()
        db.refresh(subject)

    return subject

@app.put("/api/subjects/{subject_id}", response_model=SubjectOut)
def update_subject(subject_id: int, payload: SubjectUpdate, db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    for key, val in payload.dict(exclude_unset=True).items():
        setattr(subject, key, val)
    db.commit()
    db.refresh(subject)
    return subject

@app.delete("/api/subjects/{subject_id}")
def delete_subject(subject_id: int, db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    db.delete(subject)
    db.commit()
    return {"message": "Subject deleted successfully"}

@app.post("/api/topics", response_model=TopicOut)
def create_topic(payload: TopicCreate, db: Session = Depends(get_db)):
    if not payload.subject_id:
        raise HTTPException(status_code=400, detail="subject_id is required")
    topic = Topic(
        subject_id=payload.subject_id,
        name=payload.name,
        mastery=payload.mastery,
        importance=payload.importance,
        estimated_hours_needed=payload.estimated_hours_needed or 2.0
    )
    db.add(topic)
    db.commit()
    db.refresh(topic)
    return topic

@app.put("/api/topics/{topic_id}", response_model=TopicOut)
def update_topic(topic_id: int, payload: TopicUpdate, db: Session = Depends(get_db)):
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    for key, val in payload.dict(exclude_unset=True).items():
        setattr(topic, key, val)
    
    db.commit()
    db.refresh(topic)
    return topic

@app.delete("/api/topics/{topic_id}")
def delete_topic(topic_id: int, db: Session = Depends(get_db)):
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    db.delete(topic)
    db.commit()
    return {"message": "Topic deleted successfully"}

# ----------------- STUDY SESSIONS & PROGRESS -----------------

@app.get("/api/sessions", response_model=List[StudySessionOut])
def get_sessions(
    profile_id: int = Query(..., description="Student profile ID"),
    date_str: Optional[str] = Query(None, description="Filter by YYYY-MM-DD"),
    db: Session = Depends(get_db)
):
    query = db.query(StudySession).filter(StudySession.profile_id == profile_id)
    if date_str:
        query = query.filter(StudySession.date == date_str)
    
    sessions = query.order_by(StudySession.date, StudySession.start_time).all()
    results = []
    for s in sessions:
        results.append({
            "id": s.id,
            "profile_id": s.profile_id,
            "subject_id": s.subject_id,
            "topic_id": s.topic_id,
            "title": s.title,
            "session_type": s.session_type,
            "date": s.date,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "duration_minutes": s.duration_minutes,
            "is_completed": s.is_completed,
            "is_missed": getattr(s, "is_missed", False),
            "status": getattr(s, "status", "completed" if s.is_completed else "pending"),
            "completed_at": s.completed_at,
            "notes": s.notes,
            "priority_rank": s.priority_rank,
            "rationale": s.rationale,
            "subject_name": s.subject.name if s.subject else "Subject",
            "subject_color": s.subject.color if s.subject else "#6366F1",
            "topic_name": s.topic.name if s.topic else "Topic"
        })
    return results

@app.put("/api/sessions/{session_id}")
def update_session(session_id: int, payload: StudySessionUpdate, db: Session = Depends(get_db)):
    session = db.query(StudySession).filter(StudySession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Handle status & completion
    if payload.status is not None:
        if payload.status == "completed":
            session.is_completed = True
            session.is_missed = False
            session.status = "completed"
            session.completed_at = date.today().isoformat()
        elif payload.status == "missed":
            session.is_completed = False
            session.is_missed = True
            session.status = "missed"
            session.completed_at = None
        else:
            session.is_completed = False
            session.is_missed = False
            session.status = "pending"
            session.completed_at = None
    elif payload.is_completed is not None:
        session.is_completed = payload.is_completed
        if payload.is_completed:
            session.is_missed = False
            session.status = "completed"
            session.completed_at = date.today().isoformat()
        else:
            session.status = "pending"
            session.completed_at = None
    elif payload.is_missed is not None:
        session.is_missed = payload.is_missed
        if payload.is_missed:
            session.is_completed = False
            session.status = "missed"
            session.completed_at = None
        else:
            session.status = "pending"
            
    # When completed, boost mastery
    if session.is_completed and session.topic:
        if session.session_type in ["practice", "revision"] and session.topic.mastery < 5:
            session.topic.mastery = min(5, session.topic.mastery + 1)
                
    if payload.duration_minutes is not None:
        session.duration_minutes = payload.duration_minutes
    if payload.notes is not None:
        session.notes = payload.notes
    if payload.session_type is not None:
        session.session_type = payload.session_type
    if payload.start_time is not None:
        session.start_time = payload.start_time
    if payload.end_time is not None:
        session.end_time = payload.end_time

    db.commit()
    db.refresh(session)
    return {
        "success": True,
        "message": f"Session updated to {session.status}",
        "session": {
            "id": session.id,
            "is_completed": session.is_completed,
            "is_missed": session.is_missed,
            "status": session.status,
            "topic_mastery": session.topic.mastery if session.topic else None
        }
    }

# ----------------- MANUAL TASKS CRUD -----------------

def format_manual_task_out(t: ManualTask) -> dict:
    return {
        "id": t.id,
        "profile_id": t.profile_id,
        "subject_id": t.subject_id,
        "topic_id": t.topic_id,
        "title": t.title,
        "description": t.description or "",
        "category": t.category or "study",
        "date": t.date,
        "start_time": t.start_time or "09:00",
        "end_time": t.end_time or "10:00",
        "duration_minutes": t.duration_minutes or 60,
        "priority": t.priority or "medium",
        "is_completed": bool(t.is_completed),
        "is_missed": bool(t.is_missed),
        "status": t.status or "pending",
        "completed_at": t.completed_at,
        "notes": t.notes or "",
        "subject_name": t.subject.name if t.subject else None,
        "subject_color": t.subject.color if t.subject else "#6366F1",
        "topic_name": t.topic.name if t.topic else None,
        "source": "manual"
    }

@app.get("/api/manual-tasks", response_model=List[ManualTaskOut])
def get_manual_tasks(
    profile_id: int = Query(...),
    date_str: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(ManualTask).filter(ManualTask.profile_id == profile_id)
    if date_str:
        query = query.filter(ManualTask.date == date_str)
    if date_from:
        query = query.filter(ManualTask.date >= date_from)
    if date_to:
        query = query.filter(ManualTask.date <= date_to)
    tasks = query.order_by(ManualTask.date, ManualTask.start_time).all()
    return [format_manual_task_out(t) for t in tasks]

@app.post("/api/manual-tasks", response_model=ManualTaskOut, status_code=status.HTTP_201_CREATED)
def create_manual_task(payload: ManualTaskCreate, db: Session = Depends(get_db)):
    profile = db.query(StudentProfile).filter(StudentProfile.id == payload.profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    if payload.subject_id:
        sub = db.query(Subject).filter(Subject.id == payload.subject_id, Subject.profile_id == payload.profile_id).first()
        if not sub:
            raise HTTPException(status_code=400, detail="Invalid subject ID for this profile")
    if payload.topic_id:
        top = db.query(Topic).filter(Topic.id == payload.topic_id).first()
        if not top:
            raise HTTPException(status_code=400, detail="Invalid topic ID")

    start_min = timestr_to_minutes(payload.start_time or "09:00")
    duration = max(5, int(payload.duration_minutes or 60))
    end_time_str = payload.end_time
    if not end_time_str:
        end_time_str = minutes_to_timestr(start_min + duration)

    task = ManualTask(
        profile_id=payload.profile_id,
        subject_id=payload.subject_id,
        topic_id=payload.topic_id,
        title=payload.title.strip() if payload.title else "Untitled Task",
        description=payload.description or "",
        category=payload.category if payload.category in VALID_CATEGORIES else "study",
        date=payload.date,
        start_time=payload.start_time or "09:00",
        end_time=end_time_str,
        duration_minutes=duration,
        priority=payload.priority if payload.priority in VALID_PRIORITIES else "medium",
        is_completed=False,
        is_missed=False,
        status="pending",
        notes=payload.notes or ""
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return format_manual_task_out(task)

@app.get("/api/manual-tasks/{task_id}", response_model=ManualTaskOut)
def get_manual_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(ManualTask).filter(ManualTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Manual task not found")
    return format_manual_task_out(task)

@app.put("/api/manual-tasks/{task_id}", response_model=ManualTaskOut)
def update_manual_task(task_id: int, payload: ManualTaskUpdate, db: Session = Depends(get_db)):
    task = db.query(ManualTask).filter(ManualTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Manual task not found")
        
    if payload.title is not None:
        task.title = payload.title.strip() or task.title
    if payload.description is not None:
        task.description = payload.description
    if payload.category is not None and payload.category in VALID_CATEGORIES:
        task.category = payload.category
    if payload.date is not None:
        task.date = payload.date
    if payload.start_time is not None:
        task.start_time = payload.start_time
    if payload.duration_minutes is not None:
        task.duration_minutes = max(5, int(payload.duration_minutes))
    if payload.end_time is not None:
        task.end_time = payload.end_time
    elif payload.start_time is not None or payload.duration_minutes is not None:
        start_m = timestr_to_minutes(task.start_time)
        task.end_time = minutes_to_timestr(start_m + task.duration_minutes)

    if payload.priority is not None and payload.priority in VALID_PRIORITIES:
        task.priority = payload.priority
    if payload.notes is not None:
        task.notes = payload.notes
    if payload.subject_id is not None:
        task.subject_id = payload.subject_id if payload.subject_id > 0 else None
    if payload.topic_id is not None:
        task.topic_id = payload.topic_id if payload.topic_id > 0 else None

    # Handle completion status
    if payload.status is not None:
        if payload.status == "completed":
            task.is_completed = True
            task.is_missed = False
            task.status = "completed"
            task.completed_at = date.today().isoformat()
        elif payload.status == "missed":
            task.is_completed = False
            task.is_missed = True
            task.status = "missed"
            task.completed_at = None
        else:
            task.is_completed = False
            task.is_missed = False
            task.status = "pending"
            task.completed_at = None
    elif payload.is_completed is not None:
        task.is_completed = payload.is_completed
        if payload.is_completed:
            task.is_missed = False
            task.status = "completed"
            task.completed_at = date.today().isoformat()
        else:
            task.status = "pending"
            task.completed_at = None
    elif payload.is_missed is not None:
        task.is_missed = payload.is_missed
        if payload.is_missed:
            task.is_completed = False
            task.status = "missed"
            task.completed_at = None
        else:
            task.status = "pending"

    db.commit()
    db.refresh(task)
    return format_manual_task_out(task)

@app.delete("/api/manual-tasks/{task_id}")
def delete_manual_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(ManualTask).filter(ManualTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Manual task not found")
    db.delete(task)
    db.commit()
    return {"success": True, "message": f"Manual task '{task.title}' deleted successfully", "id": task_id}

# ----------------- SCHEDULER & REGENERATION -----------------

@app.post("/api/schedule/generate", response_model=ScheduleGenerationResponse)
def trigger_schedule_generation(payload: ScheduleGenerationRequest, db: Session = Depends(get_db)):
    scheduler = IntelligentScheduler(db=db, profile_id=payload.profile_id)
    result = scheduler.generate_schedule(
        start_date=payload.start_date,
        horizon_days=payload.horizon_days or 7,
        preserve_completed=payload.preserve_completed
    )
    return result

@app.get("/api/schedule/summary/{profile_id}", response_model=ScheduleSummary)
def get_schedule_summary(profile_id: int, db: Session = Depends(get_db)):
    """
    Returns accurate live schedule summary, capacity utilization,
    and backlog deficit without mutating existing sessions.
    """
    scheduler = IntelligentScheduler(db=db, profile_id=profile_id)
    return scheduler.get_current_summary()

# ----------------- ANALYTICS -----------------

@app.get("/api/analytics/{profile_id}")
def get_analytics(profile_id: int, db: Session = Depends(get_db)):
    profile = db.query(StudentProfile).filter(StudentProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    sessions = db.query(StudySession).filter(StudySession.profile_id == profile_id).all()
    subjects = db.query(Subject).filter(Subject.profile_id == profile_id).all()

    total_sessions = len(sessions)
    completed_sessions = sum(1 for s in sessions if s.is_completed)
    missed_sessions = sum(1 for s in sessions if getattr(s, "is_missed", False))
    pending_sessions = sum(1 for s in sessions if not s.is_completed and not getattr(s, "is_missed", False))
    total_planned_hours = round(sum(s.duration_minutes for s in sessions) / 60.0, 1)
    completed_hours = round(sum(s.duration_minutes for s in sessions if s.is_completed) / 60.0, 1)
    remaining_hours = max(0.0, round(total_planned_hours - completed_hours, 1))
    completion_rate = round((completed_sessions / total_sessions * 100), 1) if total_sessions > 0 else 0.0

    # Subject allocation
    subject_allocation = []
    for sub in subjects:
        sub_sessions = [s for s in sessions if s.subject_id == sub.id]
        hrs = round(sum(s.duration_minutes for s in sub_sessions) / 60.0, 1)
        comp_hrs = round(sum(s.duration_minutes for s in sub_sessions if s.is_completed) / 60.0, 1)
        subject_allocation.append({
            "name": sub.name,
            "code": sub.code,
            "color": sub.color,
            "planned_hours": hrs,
            "completed_hours": comp_hrs,
            "topic_count": len(sub.topics),
            "deadline": sub.assessment_date
        })

    # Topic Mastery & Priority Table
    topic_data = []
    weak_topics = []
    for sub in subjects:
        for t in sub.topics:
            t_sessions = [s for s in sessions if s.topic_id == t.id]
            t_done = sum(1 for s in t_sessions if s.is_completed)
            item = {
                "id": t.id,
                "name": t.name,
                "subject": sub.name,
                "subject_code": sub.code,
                "color": sub.color,
                "mastery": t.mastery,
                "importance": t.importance,
                "priority_score": t.priority_score,
                "explanation": t.explanation,
                "factors": json.loads(t.explanation_factors_json) if t.explanation_factors_json else {},
                "total_sessions": len(t_sessions),
                "completed_sessions": t_done,
                "deadline": sub.assessment_date
            }
            topic_data.append(item)
            if t.mastery <= 2:
                weak_topics.append(item)

    # Daily workload progression
    daily_progression = {}
    for s in sessions:
        if s.date not in daily_progression:
            daily_progression[s.date] = {"date": s.date, "planned_minutes": 0, "completed_minutes": 0}
        daily_progression[s.date]["planned_minutes"] += s.duration_minutes
        if s.is_completed:
            daily_progression[s.date]["completed_minutes"] += s.duration_minutes

    daily_chart_data = [
        {
            "date": d,
            "planned_hours": round(val["planned_minutes"] / 60.0, 1),
            "completed_hours": round(val["completed_minutes"] / 60.0, 1)
        }
        for d, val in sorted(daily_progression.items())
    ]

    # Session type distribution
    type_counts = {"study": 0.0, "practice": 0.0, "revision": 0.0}
    for s in sessions:
        if s.session_type in type_counts:
            type_counts[s.session_type] += round(s.duration_minutes / 60.0, 1)

    return {
        "summary": {
            "total_sessions": total_sessions,
            "completed_sessions": completed_sessions,
            "missed_sessions": missed_sessions,
            "pending_sessions": pending_sessions,
            "total_planned_hours": total_planned_hours,
            "completed_hours": completed_hours,
            "remaining_hours": remaining_hours,
            "completion_rate": completion_rate,
            "weak_topics_count": len(weak_topics),
            "subjects_count": len(subjects)
        },
        "subject_allocation": subject_allocation,
        "topic_data": sorted(topic_data, key=lambda x: x["priority_score"], reverse=True),
        "weak_topics": weak_topics,
        "daily_chart_data": daily_chart_data,
        "session_types": [
            {"name": "Concept Study", "hours": round(type_counts["study"], 1), "color": "#6366F1"},
            {"name": "Applied Practice", "hours": round(type_counts["practice"], 1), "color": "#F59E0B"},
            {"name": "Spaced Revision", "hours": round(type_counts["revision"], 1), "color": "#10B981"}
        ]
    }

# ----------------- TEST RUNNER ENDPOINT -----------------

@app.get("/api/tests/run")
def run_test_suite():
    """
    Executes pytest on the test suite and returns structured results
    for the in-app Evaluation & Testing demonstration dashboard.
    """
    import sys
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    test_target = os.path.join("backend", "tests")
    
    cmd = [sys.executable, "-m", "pytest", test_target, "-v", "--tb=short"]
    try:
        env = os.environ.copy()
        env["PYTHONPATH"] = root_dir
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30,
            cwd=root_dir,
            env=env
        )
        output = proc.stdout + "\n" + proc.stderr
        passed = proc.returncode == 0

        # Parse test outcomes
        lines = output.splitlines()
        test_details = []
        for line in lines:
            if "::test_" in line:
                parts = line.split("::")
                if len(parts) >= 2:
                    test_name_and_status = parts[1]
                    status = "PASSED" if "PASSED" in test_name_and_status else "FAILED"
                    test_func = test_name_and_status.split()[0]
                    test_details.append({
                        "name": test_func,
                        "status": status,
                        "description": test_func.replace("test_", "").replace("_", " ").capitalize()
                    })

        return {
            "all_passed": passed,
            "returncode": proc.returncode,
            "output": output,
            "tests_run": len(test_details),
            "test_details": test_details,
            "summary": "All scheduler constraint tests and invariant verifications passed successfully." if passed else "Some tests failed."
        }
    except Exception as e:
        return {
            "all_passed": False,
            "error": str(e),
            "summary": "Error executing automated test runner"
        }

if __name__ == "__main__":
    import uvicorn
    # Render assigns dynamic PORT environment variable (e.g. 10000)
    # Default to 8001 for local development
    port = int(os.environ.get("PORT", 8001))
    # Host on 0.0.0.0 in production or when PORT is set (Render requirement)
    host = os.environ.get("HOST", "0.0.0.0" if os.environ.get("PORT") else "127.0.0.1")
    # Disable reload in production or on Render
    is_prod = os.environ.get("RENDER") == "true" or os.environ.get("ENVIRONMENT", "").lower() == "production"
    uvicorn.run("backend.main:app", host=host, port=port, reload=not is_prod)

