import json
from datetime import date, timedelta
from sqlalchemy.orm import Session
from .models import StudentProfile, Subject, Topic, StudySession
from .scheduler import IntelligentScheduler

def seed_demo_profiles(db: Session):
    """
    Seeds three distinct student personas:
    1. Beginner: Low mastery, limited study hours (Govind Innani)
    2. Intermediate: Mixed mastery, moderate study hours (Lakshy Kesharwani)
    3. Advanced: High mastery, approaching competitive deadline (Adhiranshu Singh)
    """
    today = date.today()

    demo_configs = [
        {
            "id": 1,
            "name": "Govind Innani",
            "email": "govind.innani@vit.ac.in",
            "target_exam": "VIT Semester 2 - Core CS Foundation",
            "preferred_session_minutes": 45,
            "daily_availability_json": json.dumps({
                "Monday": 2.0, "Tuesday": 2.0, "Wednesday": 2.0,
                "Thursday": 2.0, "Friday": 2.5, "Saturday": 3.0, "Sunday": 2.5
            }),
            "subjects": [
                {
                    "name": "Data Structures & Algorithms",
                    "code": "CSE2001",
                    "color": "#6366F1",  # Royal Indigo
                    "assessment_date": (today + timedelta(days=5)).isoformat(),
                    "topics": [
                        {"name": "Dynamic Programming", "mastery": 1, "importance": 5},
                        {"name": "Graph Traversal & Shortest Path", "mastery": 2, "importance": 5},
                        {"name": "Binary Search Trees", "mastery": 3, "importance": 4},
                        {"name": "Arrays & Strings", "mastery": 4, "importance": 3}
                    ]
                },
                {
                    "name": "Discrete Mathematics",
                    "code": "MAT2002",
                    "color": "#8B5CF6",  # Violet
                    "assessment_date": (today + timedelta(days=6)).isoformat(),
                    "topics": [
                        {"name": "Recurrence Relations & Generating Functions", "mastery": 1, "importance": 4},
                        {"name": "Graph Theory & Trees", "mastery": 2, "importance": 4},
                        {"name": "Combinatorics & Permutations", "mastery": 3, "importance": 4},
                        {"name": "Propositional & Predicate Logic", "mastery": 4, "importance": 3}
                    ]
                }
            ]
        },
        {
            "id": 2,
            "name": "Lakshy Kesharwani",
            "email": "lakshy.kesharwani@vit.ac.in",
            "target_exam": "VIT AI & Data Engineering Mid-Term",
            "preferred_session_minutes": 60,
            "daily_availability_json": json.dumps({
                "Monday": 3.5, "Tuesday": 3.0, "Wednesday": 3.5,
                "Thursday": 3.0, "Friday": 4.0, "Saturday": 4.5, "Sunday": 4.0
            }),
            "subjects": [
                {
                    "name": "Machine Learning Foundations",
                    "code": "AIML3001",
                    "color": "#7C3AED",  # Deep Violet
                    "assessment_date": (today + timedelta(days=7)).isoformat(),
                    "topics": [
                        {"name": "Gradient Descent & Adam Optimizer", "mastery": 2, "importance": 5},
                        {"name": "Regularization: L1, L2 & Dropout", "mastery": 3, "importance": 4},
                        {"name": "Linear & Logistic Regression", "mastery": 4, "importance": 4},
                        {"name": "Evaluation Metrics: ROC-AUC & F1", "mastery": 4, "importance": 3}
                    ]
                },
                {
                    "name": "Database Systems",
                    "code": "CSE3002",
                    "color": "#3B82F6",  # Blue
                    "assessment_date": (today + timedelta(days=9)).isoformat(),
                    "topics": [
                        {"name": "Query Optimization & B-Tree Indexing", "mastery": 2, "importance": 5},
                        {"name": "ACID Transactions & Concurrency Locks", "mastery": 3, "importance": 5},
                        {"name": "Relational Normalization 1NF to BCNF", "mastery": 4, "importance": 4}
                    ]
                },
                {
                    "name": "Computer Networks",
                    "code": "CSE3003",
                    "color": "#06B6D4",  # Cyan
                    "assessment_date": (today + timedelta(days=11)).isoformat(),
                    "topics": [
                        {"name": "TCP Congestion Control & Flow Control", "mastery": 2, "importance": 4},
                        {"name": "Subnetting, CIDR & NAT Routing", "mastery": 4, "importance": 3}
                    ]
                }
            ]
        },
        {
            "id": 3,
            "name": "Adhiranshu Singh",
            "email": "adhiranshu.singh@vit.ac.in",
            "target_exam": "GATE CS & Distributed Systems Assessment",
            "preferred_session_minutes": 60,
            "daily_availability_json": json.dumps({
                "Monday": 4.0, "Tuesday": 4.0, "Wednesday": 4.0,
                "Thursday": 4.0, "Friday": 4.5, "Saturday": 5.0, "Sunday": 5.0
            }),
            "subjects": [
                {
                    "name": "Advanced Distributed Systems",
                    "code": "CSE4001",
                    "color": "#4F46E5",  # Indigo
                    "assessment_date": (today + timedelta(days=4)).isoformat(),
                    "topics": [
                        {"name": "Raft Consensus & Distributed Log Replication", "mastery": 4, "importance": 5},
                        {"name": "Distributed Hash Tables & Consistent Hashing", "mastery": 4, "importance": 4},
                        {"name": "Vector Clocks & Causality", "mastery": 5, "importance": 5}
                    ]
                },
                {
                    "name": "Deep Learning Systems",
                    "code": "AIML4002",
                    "color": "#9333EA",  # Purple
                    "assessment_date": (today + timedelta(days=5)).isoformat(),
                    "topics": [
                        {"name": "Multi-Head Self-Attention & Transformers", "mastery": 4, "importance": 5},
                        {"name": "Diffusion Models & Score-based Generative AI", "mastery": 3, "importance": 4},
                        {"name": "Quantization (FP16/INT8) & Model Pruning", "mastery": 4, "importance": 4}
                    ]
                }
            ]
        }
    ]

    for item in demo_configs:
        existing = db.query(StudentProfile).filter(StudentProfile.id == item["id"]).first()
        if existing:
            continue

        profile = StudentProfile(
            id=item["id"],
            name=item["name"],
            email=item["email"],
            target_exam=item["target_exam"],
            preferred_session_minutes=item["preferred_session_minutes"],
            daily_availability_json=item["daily_availability_json"]
        )
        db.add(profile)
        db.flush()

        for s_data in item["subjects"]:
            subject = Subject(
                profile_id=profile.id,
                name=s_data["name"],
                code=s_data["code"],
                color=s_data["color"],
                assessment_date=s_data["assessment_date"]
            )
            db.add(subject)
            db.flush()

            for t_data in s_data["topics"]:
                topic = Topic(
                    subject_id=subject.id,
                    name=t_data["name"],
                    mastery=t_data["mastery"],
                    importance=t_data["importance"],
                    estimated_hours_needed=2.0
                )
                db.add(topic)
                db.flush()

        db.commit()

        # Run scheduler to generate initial schedule for each seeded profile
        scheduler = IntelligentScheduler(db=db, profile_id=profile.id)
        scheduler.generate_schedule(start_date=today.isoformat(), horizon_days=7)

def reset_demo_profile(db: Session, profile_id: int):
    """Resets a given profile back to its original demo state."""
    profile = db.query(StudentProfile).filter(StudentProfile.id == profile_id).first()
    if profile:
        db.delete(profile)
        db.commit()
    seed_demo_profiles(db)
