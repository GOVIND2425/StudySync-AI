import json
import math
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session

from .models import StudentProfile, Subject, Topic, StudySession

WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

def parse_iso_date(date_str: str) -> date:
    """Safely parse YYYY-MM-DD string to date object."""
    try:
        return datetime.strptime(date_str.strip(), "%Y-%m-%d").date()
    except Exception:
        return date.today() + timedelta(days=7)

def minutes_to_timestr(total_mins_from_midnight: int) -> str:
    """Convert minutes from midnight to HH:MM format."""
    hours = (total_mins_from_midnight // 60) % 24
    mins = total_mins_from_midnight % 60
    return f"{hours:02d}:{mins:02d}"

def timestr_to_minutes(time_str: str) -> int:
    """Convert HH:MM format to minutes from midnight."""
    try:
        parts = time_str.split(":")
        return int(parts[0]) * 60 + int(parts[1])
    except Exception:
        return 540  # Default 09:00 AM

def calculate_priority(
    mastery: int,
    importance: int,
    days_to_deadline: int,
    estimated_hours_needed: float = 2.0,
    unfinished_workload_hours: Optional[float] = None
) -> Tuple[float, str, Dict[str, Any]]:
    """
    Explainable and Deterministic Intelligent Priority Formulation:
    P = (w_gap * Gap_norm + w_imp * Imp_norm + w_urg * Urg_norm + w_eff * Eff_norm + w_work * Work_norm) * 100
    
    Factors:
      1. Knowledge Gap = 6 - mastery (mastery 1..5 gives gap 5..1)
         Normalized: gap_norm = (6 - mastery) / 5.0 in [0.2, 1.0]
      2. Importance Score: importance in [1, 5]
         Normalized: imp_norm = importance / 5.0 in [0.2, 1.0]
      3. Days Remaining Urgency: Hyperbolic proximity decay
      4. Estimated Study Effort: Scale of effort required (norm against 4.0h baseline)
      5. Unfinished Workload: Ratio of remaining study requirement
      
    Weights:
      w_gap  = 0.35 (35% Knowledge Gap)
      w_imp  = 0.25 (25% Curriculum Importance)
      w_urg  = 0.20 (20% Exam Proximity Urgency)
      w_eff  = 0.10 (10% Estimated Effort Scope)
      w_work = 0.10 (10% Unfinished Workload)
    """
    clean_mastery = max(1, min(5, mastery))
    clean_importance = max(1, min(5, importance))
    clean_effort = max(0.5, float(estimated_hours_needed or 2.0))

    if unfinished_workload_hours is None:
        unfinished_hours = clean_effort
    else:
        unfinished_hours = max(0.0, float(unfinished_workload_hours))

    # 1. Knowledge Gap (6 - mastery score)
    knowledge_gap = 6 - clean_mastery
    gap_norm = knowledge_gap / 5.0  # 1 -> 1.0, 5 -> 0.2

    # 2. Importance Score
    imp_norm = clean_importance / 5.0  # 1 -> 0.2, 5 -> 1.0

    # 3. Urgency based on days remaining to assessment
    if days_to_deadline <= 0:
        urgency_factor = 1.0
    elif days_to_deadline <= 2:
        urgency_factor = 0.95
    elif days_to_deadline <= 4:
        urgency_factor = 0.80
    elif days_to_deadline <= 7:
        urgency_factor = 0.65
    elif days_to_deadline <= 14:
        urgency_factor = 0.45
    elif days_to_deadline <= 21:
        urgency_factor = 0.30
    else:
        urgency_factor = 0.15

    # 4. Estimated Study Effort Normalization (baseline 4.0h module)
    eff_norm = min(1.0, max(0.2, clean_effort / 4.0))

    # 5. Unfinished Workload Ratio
    work_norm = min(1.0, max(0.1, unfinished_hours / clean_effort))

    # Weighted calculation
    w_gap, w_imp, w_urg, w_eff, w_work = 0.35, 0.25, 0.20, 0.10, 0.10
    gap_pts = w_gap * gap_norm * 100.0
    imp_pts = w_imp * imp_norm * 100.0
    urg_pts = w_urg * urgency_factor * 100.0
    eff_pts = w_eff * eff_norm * 100.0
    work_pts = w_work * work_norm * 100.0

    total_score = round(gap_pts + imp_pts + urg_pts + eff_pts + work_pts, 1)

    factors = {
        "mastery": clean_mastery,
        "knowledge_gap": knowledge_gap,
        "gap_points": round(gap_pts, 1),
        "importance": clean_importance,
        "importance_points": round(imp_pts, 1),
        "days_to_deadline": max(0, days_to_deadline),
        "urgency_factor": round(urgency_factor, 2),
        "urgency_points": round(urg_pts, 1),
        "estimated_effort_hours": round(clean_effort, 1),
        "effort_points": round(eff_pts, 1),
        "unfinished_hours": round(unfinished_hours, 1),
        "workload_points": round(work_pts, 1),
        "total_score": total_score
    }

    urgency_desc = (
        f"assessment is imminent in {days_to_deadline} day(s)" if days_to_deadline <= 3
        else f"assessment is approaching in {days_to_deadline} days" if days_to_deadline <= 7
        else f"assessment is in {days_to_deadline} days"
    )

    gap_desc = (
        f"wide knowledge gap ({knowledge_gap}/5 deficit, mastery {clean_mastery}/5)" if clean_mastery <= 2
        else f"moderate knowledge gap ({knowledge_gap}/5 deficit, mastery {clean_mastery}/5)" if clean_mastery == 3
        else f"narrow knowledge gap ({knowledge_gap}/5 deficit, mastery {clean_mastery}/5)"
    )

    importance_desc = (
        f"high curricular importance ({clean_importance}/5)" if clean_importance >= 4
        else f"standard curricular importance ({clean_importance}/5)" if clean_importance == 3
        else f"supplementary importance ({clean_importance}/5)"
    )

    explanation = (
        f"Prioritized with score {total_score}/100 because of {gap_desc} (+{round(gap_pts, 1)} pts), "
        f"{importance_desc} (+{round(imp_pts, 1)} pts), {urgency_desc} (+{round(urg_pts, 1)} pts), "
        f"and required effort {clean_effort}h with unfinished workload (+{round(eff_pts + work_pts, 1)} pts)."
    )

    return total_score, explanation, factors

def calculate_topic_workload(mastery: int, importance: int, estimated_effort_hours: float = 2.0) -> Dict[str, float]:
    """
    Computes required hours broken down into 3 pedagogical phases:
    1. Concept Foundation (Study)
    2. Practice & Application (Practice)
    3. Spaced Revision (Revision)
    """
    effort = max(0.5, float(estimated_effort_hours or 2.0))
    # Concept Study depends heavily on mastery
    if mastery == 1:
        study_h = effort * 0.45 * (importance / 4.0)
    elif mastery == 2:
        study_h = effort * 0.35 * (importance / 4.0)
    elif mastery == 3:
        study_h = effort * 0.25 * (importance / 4.0)
    elif mastery == 4:
        study_h = effort * 0.15 * (importance / 4.0)
    else:
        study_h = 0.25  # Mastery 5 refresher

    # Practice session hours
    practice_h = effort * 0.40 * (1.0 + (5 - mastery) * 0.1)

    # Revision session hours
    revision_h = effort * 0.20 if importance >= 3 else 0.5

    study_h = round(round(study_h * 4) / 4, 2)
    practice_h = round(round(practice_h * 4) / 4, 2)
    revision_h = round(round(revision_h * 4) / 4, 2)

    return {
        "study": max(0.25, study_h),
        "practice": max(0.5, practice_h),
        "revision": max(0.25, revision_h),
        "total": round(study_h + practice_h + revision_h, 2)
    }

class IntelligentScheduler:
    def __init__(self, db: Session, profile_id: int):
        self.db = db
        self.profile_id = profile_id

    def generate_schedule(
        self,
        start_date: Optional[str] = None,
        horizon_days: int = 7,
        preserve_completed: bool = True
    ) -> Dict[str, Any]:
        profile = self.db.query(StudentProfile).filter(StudentProfile.id == self.profile_id).first()
        if not profile:
            raise ValueError(f"StudentProfile with ID {self.profile_id} not found")

        today = parse_iso_date(start_date) if start_date else date.today()

        try:
            daily_avail = json.loads(profile.daily_availability_json)
        except Exception:
            daily_avail = {
                "Monday": 3.0, "Tuesday": 2.5, "Wednesday": 3.0,
                "Thursday": 2.5, "Friday": 4.0, "Saturday": 5.0, "Sunday": 4.0
            }

        preferred_session_mins = profile.preferred_session_minutes or 60

        # Retrieve subjects & topics
        subjects = self.db.query(Subject).filter(Subject.profile_id == self.profile_id).all()
        if not subjects:
            return {
                "success": False,
                "message": "No subjects found for this profile. Please add subjects and topics first.",
                "summary": self._empty_summary(),
                "sessions": []
            }

        # Handle existing sessions
        existing_sessions = (
            self.db.query(StudySession)
            .filter(StudySession.profile_id == self.profile_id)
            .all()
        )

        completed_sessions = [s for s in existing_sessions if s.is_completed]

        if preserve_completed:
            for s in existing_sessions:
                if not s.is_completed:
                    self.db.delete(s)
            self.db.commit()
        else:
            for s in existing_sessions:
                self.db.delete(s)
            self.db.commit()
            completed_sessions = []

        # Build day-by-day timeline with time intervals to prevent overlapping
        timeline: Dict[str, Dict[str, Any]] = {}
        for d in range(horizon_days):
            current_day = today + timedelta(days=d)
            day_name = WEEKDAYS[current_day.weekday()]
            avail_hours = float(daily_avail.get(day_name, 3.0))
            timeline[current_day.isoformat()] = {
                "date": current_day,
                "day_name": day_name,
                "total_avail_mins": int(avail_hours * 60),
                "used_mins": 0,
                "intervals": [],  # List of (start_min, end_min)
                "sessions": []
            }

        # Track preserved sessions in timeline intervals
        for cs in completed_sessions:
            if cs.date in timeline:
                start_m = timestr_to_minutes(cs.start_time)
                end_m = timestr_to_minutes(cs.end_time)
                timeline[cs.date]["intervals"].append((start_m, end_m))
                timeline[cs.date]["used_mins"] += cs.duration_minutes

        # Calculate Priority Scores and Workload for each topic
        all_topics_meta = []
        for subject in subjects:
            deadline = parse_iso_date(subject.assessment_date)
            for topic in subject.topics:
                days_left = (deadline - today).days

                # Base estimated effort (safeguard against legacy inflated values from earlier compounding bug)
                base_effort = float(topic.estimated_hours_needed or 2.0)
                if base_effort > 20.0:
                    base_effort = 2.0
                    topic.estimated_hours_needed = 2.0

                # Compute target workload for the topic
                workload = calculate_topic_workload(
                    mastery=topic.mastery,
                    importance=topic.importance,
                    estimated_effort_hours=base_effort
                )

                target_study_mins = int(workload["study"] * 60)
                target_practice_mins = int(workload["practice"] * 60)
                target_revision_mins = int(workload["revision"] * 60)
                total_target_mins = int(workload["total"] * 60)

                # Calculate minutes completed for this topic (prevent double-counting)
                completed_study_mins = sum(
                    cs.duration_minutes for cs in completed_sessions 
                    if cs.topic_id == topic.id and cs.session_type == "study"
                )
                completed_practice_mins = sum(
                    cs.duration_minutes for cs in completed_sessions 
                    if cs.topic_id == topic.id and cs.session_type == "practice"
                )
                completed_revision_mins = sum(
                    cs.duration_minutes for cs in completed_sessions 
                    if cs.topic_id == topic.id and cs.session_type == "revision"
                )
                total_completed_topic_mins = sum(
                    cs.duration_minutes for cs in completed_sessions 
                    if cs.topic_id == topic.id
                )

                # Subtract completed minutes from each pedagogical phase
                rem_study_mins = max(0, target_study_mins - completed_study_mins)
                rem_practice_mins = max(0, target_practice_mins - completed_practice_mins)
                rem_revision_mins = max(0, target_revision_mins - completed_revision_mins)

                # Ensure remaining phase sum strictly reflects unfinished requirement
                net_remaining_mins = max(0, total_target_mins - total_completed_topic_mins)
                phase_sum = rem_study_mins + rem_practice_mins + rem_revision_mins
                if phase_sum > net_remaining_mins and phase_sum > 0:
                    ratio = net_remaining_mins / phase_sum
                    rem_study_mins = int(rem_study_mins * ratio)
                    rem_practice_mins = int(rem_practice_mins * ratio)
                    rem_revision_mins = max(0, net_remaining_mins - (rem_study_mins + rem_practice_mins))
                elif net_remaining_mins == 0:
                    rem_study_mins = 0
                    rem_practice_mins = 0
                    rem_revision_mins = 0

                unfinished_hours = round(net_remaining_mins / 60.0, 2)

                score, explanation, factors = calculate_priority(
                    mastery=topic.mastery,
                    importance=topic.importance,
                    days_to_deadline=days_left,
                    estimated_hours_needed=base_effort,
                    unfinished_workload_hours=unfinished_hours
                )

                topic.priority_score = score
                topic.explanation = explanation
                topic.explanation_factors_json = json.dumps(factors)
                # DO NOT overwrite topic.estimated_hours_needed with workload["total"]!
                # Base effort must remain stable to prevent geometric workload duplication.

                all_topics_meta.append({
                    "topic": topic,
                    "subject": subject,
                    "deadline": deadline,
                    "days_left": days_left,
                    "priority_score": score,
                    "explanation": explanation,
                    "workload": workload,
                    "unfinished_hours": unfinished_hours,
                    "remaining_phases": {
                        "study": rem_study_mins,
                        "practice": rem_practice_mins,
                        "revision": rem_revision_mins,
                        "total_mins": net_remaining_mins
                    }
                })

        self.db.commit()

        # Sort topics descending by priority score
        all_topics_meta.sort(key=lambda x: x["priority_score"], reverse=True)

        # Prepare granular session tasks ONLY for remaining unfinished workload
        session_tasks = []
        for item in all_topics_meta:
            topic = item["topic"]
            subject = item["subject"]
            deadline = item["deadline"]
            rem_phases = item["remaining_phases"]

            phases = [
                ("study", rem_phases["study"], f"Deep Concept Study: {topic.name}"),
                ("practice", rem_phases["practice"], f"Applied Problem Practice: {topic.name}"),
                ("revision", rem_phases["revision"], f"High-Yield Spaced Revision: {topic.name}")
            ]

            for stype, rem_mins, title in phases:
                remaining_mins = rem_mins
                seq_idx = 1
                while remaining_mins > 0:
                    chunk = min(remaining_mins, preferred_session_mins)
                    if chunk < 20 and len(session_tasks) > 0 and session_tasks[-1]["topic_id"] == topic.id and session_tasks[-1]["session_type"] == stype:
                        session_tasks[-1]["duration_minutes"] += chunk
                        remaining_mins = 0
                        break

                    session_tasks.append({
                        "profile_id": self.profile_id,
                        "subject_id": subject.id,
                        "subject_name": subject.name,
                        "subject_color": subject.color,
                        "topic_id": topic.id,
                        "topic_name": topic.name,
                        "title": f"{title} (Part {seq_idx})" if remaining_mins > preferred_session_mins else title,
                        "session_type": stype,
                        "duration_minutes": chunk,
                        "deadline": deadline,
                        "priority_score": item["priority_score"],
                        "rationale": (
                            f"{item['explanation']} "
                            f"[Phase: {stype.upper()}, target duration: {chunk} mins]."
                        )
                    })
                    remaining_mins -= chunk
                    seq_idx += 1

        scheduled_db_sessions: List[StudySession] = []
        unmet_tasks = []

        timeline_keys = sorted(timeline.keys())

        # Pedagogical phase weighting
        phase_order_weight = {"study": 1, "practice": 2, "revision": 3}
        session_tasks.sort(
            key=lambda t: (
                -t["priority_score"],
                phase_order_weight.get(t["session_type"], 2)
            )
        )

        for task in session_tasks:
            duration = task["duration_minutes"]
            task_deadline = task["deadline"]

            valid_dates = [
                d_str for d_str in timeline_keys
                if timeline[d_str]["date"] <= task_deadline
            ]

            if not valid_dates:
                unmet_tasks.append(task)
                continue

            if task["session_type"] == "revision":
                candidate_dates = list(reversed(valid_dates))
            else:
                candidate_dates = valid_dates

            best_day = None
            for d_str in candidate_dates:
                day_data = timeline[d_str]
                avail = day_data["total_avail_mins"] - day_data["used_mins"]
                if avail >= duration:
                    same_topic_count = sum(
                        1 for s in day_data["sessions"] if s["topic_id"] == task["topic_id"]
                    )
                    if same_topic_count < 2:
                        best_day = d_str
                        break
                    elif best_day is None:
                        best_day = d_str

            if best_day is None:
                for d_str in candidate_dates:
                    day_data = timeline[d_str]
                    if (day_data["total_avail_mins"] - day_data["used_mins"]) >= duration:
                        best_day = d_str
                        break

            if best_day is not None:
                day_data = timeline[best_day]

                # Non-overlapping time slot calculation
                # Standard day begins at 9:00 AM (minute 540)
                base_start_minute = 540
                existing_intervals = sorted(day_data["intervals"], key=lambda x: x[0])

                curr_start = base_start_minute
                for int_start, int_end in existing_intervals:
                    if curr_start + duration <= int_start:
                        # Found non-overlapping gap!
                        break
                    else:
                        curr_start = max(curr_start, int_end)

                session_start_min = curr_start
                session_end_min = session_start_min + duration

                day_data["intervals"].append((session_start_min, session_end_min))
                day_data["intervals"].sort(key=lambda x: x[0])

                start_time_str = minutes_to_timestr(session_start_min)
                end_time_str = minutes_to_timestr(session_end_min)

                new_session = StudySession(
                    profile_id=self.profile_id,
                    subject_id=task["subject_id"],
                    topic_id=task["topic_id"],
                    title=task["title"],
                    session_type=task["session_type"],
                    date=best_day,
                    start_time=start_time_str,
                    end_time=end_time_str,
                    duration_minutes=duration,
                    is_completed=False,
                    is_missed=False,
                    status="pending",
                    priority_rank=len(scheduled_db_sessions) + 1,
                    rationale=task["rationale"]
                )

                self.db.add(new_session)
                scheduled_db_sessions.append(new_session)

                day_data["used_mins"] += duration
                day_data["sessions"].append(task)
            else:
                unmet_tasks.append(task)

        self.db.commit()

        # Combine all sessions for response
        all_current_sessions = (
            self.db.query(StudySession)
            .filter(StudySession.profile_id == self.profile_id)
            .order_by(StudySession.date, StudySession.start_time)
            .all()
        )

        summary = self._compute_schedule_summary(
            timeline=timeline,
            sessions=all_current_sessions,
            unmet_tasks=unmet_tasks,
            topics_meta=all_topics_meta
        )

        return {
            "success": True,
            "message": f"Successfully generated study plan with {len(scheduled_db_sessions)} active sessions.",
            "summary": summary,
            "sessions": [self._format_session_out(s) for s in all_current_sessions]
        }

    def get_current_summary(self, horizon_days: int = 7) -> Dict[str, Any]:
        """
        Computes the current schedule summary (allocated hours, available capacity,
        true backlog deficit) from current sessions and topics without modifying the schedule.
        """
        profile = self.db.query(StudentProfile).filter(StudentProfile.id == self.profile_id).first()
        if not profile:
            return self._empty_summary()

        today = date.today()
        try:
            daily_avail = json.loads(profile.daily_availability_json)
        except Exception:
            daily_avail = {}

        timeline: Dict[str, Dict[str, Any]] = {}
        for d in range(horizon_days):
            current_day = today + timedelta(days=d)
            day_name = WEEKDAYS[current_day.weekday()]
            avail_hours = float(daily_avail.get(day_name, 3.0))
            timeline[current_day.isoformat()] = {
                "date": current_day,
                "day_name": day_name,
                "total_avail_mins": int(avail_hours * 60)
            }

        sessions = (
            self.db.query(StudySession)
            .filter(StudySession.profile_id == self.profile_id)
            .order_by(StudySession.date, StudySession.start_time)
            .all()
        )

        subjects = self.db.query(Subject).filter(Subject.profile_id == self.profile_id).all()
        all_topics_meta = []
        unmet_tasks = []

        for sub in subjects:
            for t in sub.topics:
                base_effort = float(t.estimated_hours_needed or 2.0)
                workload = calculate_topic_workload(t.mastery, t.importance, base_effort)
                t_sessions = [s for s in sessions if s.topic_id == t.id]
                scheduled_mins = sum(s.duration_minutes for s in t_sessions)
                target_total_mins = int(workload["total"] * 60)
                if scheduled_mins < target_total_mins:
                    unmet_tasks.append({
                        "topic_name": t.name,
                        "duration_minutes": target_total_mins - scheduled_mins
                    })
                all_topics_meta.append({
                    "topic": t,
                    "priority_score": t.priority_score or 50.0,
                    "explanation": t.explanation or "",
                    "workload": workload
                })

        return self._compute_schedule_summary(
            timeline=timeline,
            sessions=sessions,
            unmet_tasks=unmet_tasks,
            topics_meta=all_topics_meta
        )

    def _compute_schedule_summary(
        self,
        timeline: Dict[str, Dict[str, Any]],
        sessions: List[StudySession],
        unmet_tasks: List[Dict[str, Any]],
        topics_meta: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        total_avail_mins = sum(d["total_avail_mins"] for d in timeline.values())
        allocated_mins = sum(s.duration_minutes for s in sessions)
        study_mins = sum(s.duration_minutes for s in sessions if s.session_type == "study")
        practice_mins = sum(s.duration_minutes for s in sessions if s.session_type == "practice")
        revision_mins = sum(s.duration_minutes for s in sessions if s.session_type == "revision")

        unmet_mins = sum(t["duration_minutes"] for t in unmet_tasks)
        has_capacity_deficit = unmet_mins > 0
        deficit_hours = round(unmet_mins / 60.0, 2)

        utilization_rate = round((allocated_mins / total_avail_mins * 100.0), 1) if total_avail_mins > 0 else 0.0

        daily_breakdown = {}
        for d_str, day_data in timeline.items():
            day_sessions = [s for s in sessions if s.date == d_str]
            scheduled_m = sum(s.duration_minutes for s in day_sessions)
            daily_breakdown[d_str] = {
                "day_name": day_data["day_name"],
                "available_hours": round(day_data["total_avail_mins"] / 60.0, 1),
                "scheduled_hours": round(scheduled_m / 60.0, 1),
                "session_count": len(day_sessions),
                "is_full": scheduled_m >= day_data["total_avail_mins"]
            }

        unmet_topic_names = list(set([t["topic_name"] for t in unmet_tasks]))

        deficit_warning = None
        if has_capacity_deficit:
            deficit_warning = (
                f"Capacity alert: {deficit_hours} required study hours could not be scheduled before "
                f"deadlines within daily capacity limits. High-yield topics prioritized. "
                f"Recommendation: Increase daily availability or adjust deadlines."
            )

        top_topics = sorted(topics_meta, key=lambda x: x["priority_score"], reverse=True)[:3]
        highlights = [
            f"#{idx+1} {item['topic'].name} (Priority {item['priority_score']}/100): {item['explanation']}"
            for idx, item in enumerate(top_topics)
        ]

        return {
            "total_sessions_scheduled": len(sessions),
            "total_study_hours": round(study_mins / 60.0, 1),
            "total_practice_hours": round(practice_mins / 60.0, 1),
            "total_revision_hours": round(revision_mins / 60.0, 1),
            "total_available_hours": round(total_avail_mins / 60.0, 1),
            "allocated_hours": round(allocated_mins / 60.0, 1),
            "utilization_rate": utilization_rate,
            "capacity_deficit_hours": deficit_hours,
            "has_capacity_deficit": has_capacity_deficit,
            "deficit_warning": deficit_warning,
            "unmet_topics": unmet_topic_names,
            "daily_breakdown": daily_breakdown,
            "explanation_highlights": highlights
        }

    def _empty_summary(self) -> Dict[str, Any]:
        return {
            "total_sessions_scheduled": 0,
            "total_study_hours": 0.0,
            "total_practice_hours": 0.0,
            "total_revision_hours": 0.0,
            "total_available_hours": 0.0,
            "allocated_hours": 0.0,
            "utilization_rate": 0.0,
            "capacity_deficit_hours": 0.0,
            "has_capacity_deficit": False,
            "deficit_warning": None,
            "unmet_topics": [],
            "daily_breakdown": {},
            "explanation_highlights": []
        }

    def _format_session_out(self, s: StudySession) -> Dict[str, Any]:
        return {
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
        }
