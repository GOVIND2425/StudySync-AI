from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any

class TopicBase(BaseModel):
    name: str
    mastery: int = Field(ge=1, le=5, default=2)
    importance: int = Field(ge=1, le=5, default=4)
    estimated_hours_needed: Optional[float] = None
    status: Optional[str] = "in_progress"

class TopicCreate(TopicBase):
    subject_id: Optional[int] = None

class TopicUpdate(BaseModel):
    name: Optional[str] = None
    mastery: Optional[int] = Field(ge=1, le=5, default=None)
    importance: Optional[int] = Field(ge=1, le=5, default=None)
    estimated_hours_needed: Optional[float] = None
    status: Optional[str] = None

class TopicOut(TopicBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    subject_id: int
    priority_score: float
    explanation: str
    explanation_factors_json: str

class SubjectBase(BaseModel):
    name: str
    code: str = "CS101"
    color: str = "#6366F1"
    assessment_date: str  # YYYY-MM-DD

class SubjectCreate(SubjectBase):
    profile_id: Optional[int] = None
    topics: Optional[List[TopicBase]] = []

class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    color: Optional[str] = None
    assessment_date: Optional[str] = None

class SubjectOut(SubjectBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    profile_id: int
    topics: List[TopicOut] = []

class StudySessionBase(BaseModel):
    title: str
    session_type: str = "study"  # study, practice, revision
    date: str
    start_time: str = "10:00"
    end_time: str = "11:00"
    duration_minutes: int = 60
    is_completed: bool = False
    is_missed: bool = False
    status: str = "pending"  # pending, completed, missed
    notes: Optional[str] = ""
    rationale: Optional[str] = ""
    priority_rank: Optional[int] = 1

class StudySessionCreate(StudySessionBase):
    profile_id: int
    subject_id: int
    topic_id: int

class StudySessionUpdate(BaseModel):
    is_completed: Optional[bool] = None
    is_missed: Optional[bool] = None
    status: Optional[str] = None
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None
    session_type: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None

class StudySessionOut(StudySessionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    profile_id: int
    subject_id: int
    topic_id: int
    completed_at: Optional[str] = None
    subject_name: Optional[str] = None
    subject_color: Optional[str] = None
    topic_name: Optional[str] = None

class StudentProfileBase(BaseModel):
    name: str
    email: Optional[str] = None
    target_exam: Optional[str] = "End-Semester Examination"
    preferred_session_minutes: Optional[int] = 60
    daily_availability_json: Optional[str] = '{"Monday": 3.0, "Tuesday": 2.5, "Wednesday": 3.0, "Thursday": 2.5, "Friday": 4.0, "Saturday": 5.0, "Sunday": 4.0}'

class StudentProfileCreate(StudentProfileBase):
    pass

class StudentProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    target_exam: Optional[str] = None
    preferred_session_minutes: Optional[int] = None
    daily_availability_json: Optional[str] = None

class StudentProfileOut(StudentProfileBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    subjects: List[SubjectOut] = []

class ScheduleGenerationRequest(BaseModel):
    profile_id: int
    start_date: Optional[str] = None  # YYYY-MM-DD
    horizon_days: Optional[int] = 7
    preserve_completed: bool = True

class ScheduleSummary(BaseModel):
    total_sessions_scheduled: int
    total_study_hours: float
    total_practice_hours: float
    total_revision_hours: float
    total_available_hours: float
    allocated_hours: float
    utilization_rate: float
    capacity_deficit_hours: float
    has_capacity_deficit: bool
    deficit_warning: Optional[str] = None
    unmet_topics: List[str] = []
    daily_breakdown: Dict[str, Dict[str, Any]]
    explanation_highlights: List[str]

class ScheduleGenerationResponse(BaseModel):
    success: bool
    message: str
    summary: ScheduleSummary
    sessions: List[StudySessionOut]
