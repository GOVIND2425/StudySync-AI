import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from .database import Base

class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), default="Govind Innani")
    email = Column(String(120), default="govind.innani@vit.ac.in")
    target_exam = Column(String(100), default="VIT End-Semester Exam 2026")
    preferred_session_minutes = Column(Integer, default=60)
    daily_availability_json = Column(Text, default='{"Monday": 3.0, "Tuesday": 2.5, "Wednesday": 3.0, "Thursday": 2.5, "Friday": 4.0, "Saturday": 5.0, "Sunday": 4.0}')
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    subjects = relationship("Subject", back_populates="profile", cascade="all, delete-orphan")
    sessions = relationship("StudySession", back_populates="profile", cascade="all, delete-orphan")
    manual_tasks = relationship("ManualTask", back_populates="profile", cascade="all, delete-orphan")

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("student_profiles.id"), nullable=False)
    name = Column(String(150), nullable=False)
    code = Column(String(50), default="CS101")
    color = Column(String(30), default="#6366F1")
    assessment_date = Column(String(30), nullable=False)  # YYYY-MM-DD
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    profile = relationship("StudentProfile", back_populates="subjects")
    topics = relationship("Topic", back_populates="subject", cascade="all, delete-orphan")
    sessions = relationship("StudySession", back_populates="subject", cascade="all, delete-orphan")
    manual_tasks = relationship("ManualTask", back_populates="subject")

class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    name = Column(String(150), nullable=False)
    mastery = Column(Integer, default=2)        # 1 to 5
    importance = Column(Integer, default=4)     # 1 to 5
    estimated_hours_needed = Column(Float, default=2.0)
    priority_score = Column(Float, default=0.0)
    explanation = Column(Text, default="")
    explanation_factors_json = Column(Text, default="{}")
    status = Column(String(30), default="in_progress")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    subject = relationship("Subject", back_populates="topics")
    sessions = relationship("StudySession", back_populates="topic", cascade="all, delete-orphan")
    manual_tasks = relationship("ManualTask", back_populates="topic")

class StudySession(Base):
    __tablename__ = "study_sessions"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("student_profiles.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=False)

    title = Column(String(200), nullable=False)
    session_type = Column(String(50), default="study")  # study, practice, revision
    date = Column(String(30), nullable=False)            # YYYY-MM-DD
    start_time = Column(String(20), default="10:00")
    end_time = Column(String(20), default="11:00")
    duration_minutes = Column(Integer, default=60)
    is_completed = Column(Boolean, default=False)
    is_missed = Column(Boolean, default=False)
    status = Column(String(30), default="pending")  # pending, completed, missed
    completed_at = Column(String(50), nullable=True)
    notes = Column(Text, default="")
    priority_rank = Column(Integer, default=1)
    rationale = Column(Text, default="")
    is_manual = Column(Boolean, default=False)  # True = user-created manual task

    profile = relationship("StudentProfile", back_populates="sessions")
    subject = relationship("Subject", back_populates="sessions")
    topic = relationship("Topic", back_populates="sessions")


class ManualTask(Base):
    """
    User-created manual study tasks displayed alongside AI-generated sessions.
    Stored separately to prevent interference with AI rescheduling logic.
    AI scheduler respects manual task time slots to prevent overlap.
    """
    __tablename__ = "manual_tasks"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("student_profiles.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)   # Optional
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=True)        # Optional

    title = Column(String(200), nullable=False)
    description = Column(Text, default="")
    category = Column(String(60), default="study")
    # Categories: study | practice | revision | assignment | mock_test | custom
    date = Column(String(30), nullable=False)    # YYYY-MM-DD
    start_time = Column(String(20), default="09:00")
    end_time = Column(String(20), default="10:00")
    duration_minutes = Column(Integer, default=60)
    priority = Column(String(20), default="medium")  # low | medium | high | critical
    is_completed = Column(Boolean, default=False)
    is_missed = Column(Boolean, default=False)
    status = Column(String(30), default="pending")  # pending | completed | missed
    completed_at = Column(String(50), nullable=True)
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    profile = relationship("StudentProfile", back_populates="manual_tasks")
    subject = relationship("Subject", back_populates="manual_tasks")
    topic = relationship("Topic", back_populates="manual_tasks")
