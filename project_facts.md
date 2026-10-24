# StudySync AI – Project Fact Sheet
> **VIT AI Innovate-A-Thon 2026 — Problem Statement 7: Personalised Study Planner**

---

## 1. Exact Dependencies & Versions

### Backend (`requirements.txt` / Python 3.13)
| Package | Version | Purpose |
| :--- | :--- | :--- |
| `fastapi` | `0.162.0` | High-performance ASGI Web Framework for REST APIs |
| `uvicorn` | `0.54.0` | ASGI Web Server implementation |
| `SQLAlchemy` | `2.1.6` | Relational ORM for SQLite database interaction |
| `pydantic` | `2.14.1` | Data validation, serialisation and request schemas |
| `pytest` | `9.1.1` | Invariant testing and test suite execution |
| `httpx` | `0.28.1` | HTTP client for integration and test runner scripts |
| `python-dateutil` | `3.0.0` | ISO date parsing and timeline manipulation |

### Frontend (`frontend/package.json` / Node.js 22)
| Package | Version | Purpose |
| :--- | :--- | :--- |
| `react` | `^19.3.1` | Core UI Component Framework |
| `react-dom` | `^19.3.1` | DOM Renderer for React 19 |
| `vite` | `^8.3.4` | Build tool and fast HMR development server |
| `@vitejs/plugin-react` | `^6.1.2` | Vite plugin for React JSX compilation |
| `tailwindcss` | `^4.3.3` | Utility-first CSS styling framework |
| `@tailwindcss/vite` | `^4.3.3` | Tailwind v4 Vite compilation plugin |
| `framer-motion` | `^14.6.0` | Smooth UI micro-animations and layout transitions |
| `recharts` | `^3.10.1` | Interactive data charts (Bar, Pie, Radar charts) |
| `lucide-react` | `^1.61.0` | Semantic iconography library |
| `canvas-confetti` | `^1.9.4` | Positive behavioral reinforcement on session completion |
| `clsx` | `^2.1.1` | Conditional CSS class constructor |
| `tailwind-merge` | `^3.7.0` | Tailwind class conflict resolution |
| `oxlint` | `^1.88.0` | High-speed JavaScript/JSX code linter |

---

## 2. All REST API Endpoints

| Method | Path | Purpose |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Returns engine status, service version, and optimization mechanism. |
| `GET` | `/api/profiles` | Lists all student profiles with subjects and metadata. |
| `GET` | `/api/profiles/{profile_id}` | Retrieves detailed record of a student profile. |
| `PUT` | `/api/profiles/{profile_id}` | Updates student preferences (name, exam, daily availability JSON, preferred minutes). |
| `POST` | `/api/profiles/{profile_id}/reset` | Restores a demo persona to its default baseline state. |
| `POST` | `/api/subjects` | Creates a new subject with color, code, and assessment deadline. |
| `PUT` | `/api/subjects/{subject_id}` | Modifies subject details (code, color, assessment date, name). |
| `DELETE` | `/api/subjects/{subject_id}` | Deletes a subject and cascades deletion to all child topics and sessions. |
| `POST` | `/api/topics` | Adds a topic to a subject (initial mastery, importance, estimated effort). |
| `PUT` | `/api/topics/{topic_id}` | Updates topic parameters (mastery 1-5, importance 1-5, effort hours). |
| `DELETE` | `/api/topics/{topic_id}` | Deletes a topic and its associated scheduled study sessions. |
| `GET` | `/api/sessions` | Retrieves scheduled sessions filtered by `profile_id` and optional `date_str`. |
| `PUT` | `/api/sessions/{session_id}` | Updates session status (`completed`, `missed`, `pending`), notes, and boosts mastery on completion. |
| `POST` | `/api/schedule/generate` | Triggers the IntelligentScheduler optimization algorithm (`preserve_completed: true/false`). |
| `GET` | `/api/analytics/{profile_id}` | Returns planned vs completed hours, session distribution, and topic mastery rankings. |
| `GET` | `/api/tests/run` | Triggers `pytest backend/tests/test_scheduler.py` and returns structured JSON results for in-app UI. |

---

## 3. Database Schema (`backend/models.py`)

Database: SQLite (`backend/studysync.db`), managed via SQLAlchemy declarative Base.

### Table: `student_profiles`
- `id` (Integer, Primary Key)
- `name` (String(100), default: "Govind Innani")
- `email` (String(120), default: "govind.innani@vit.ac.in")
- `target_exam` (String(100), default: "VIT End-Semester Exam 2026")
- `preferred_session_minutes` (Integer, default: 60)
- `daily_availability_json` (Text, stores day-of-week hours mapping as JSON)
- `created_at` (DateTime, UTC timestamp)
- `updated_at` (DateTime, auto-updated timestamp)

### Table: `subjects`
- `id` (Integer, Primary Key)
- `profile_id` (Integer, Foreign Key: `student_profiles.id`, nullable=False)
- `name` (String(150), nullable=False)
- `code` (String(50), default: "CS101")
- `color` (String(30), default: "#6366F1")
- `assessment_date` (String(30), nullable=False, format: "YYYY-MM-DD")
- `created_at` (DateTime, UTC timestamp)

### Table: `topics`
- `id` (Integer, Primary Key)
- `subject_id` (Integer, Foreign Key: `subjects.id`, nullable=False)
- `name` (String(150), nullable=False)
- `mastery` (Integer, default: 2, scale: 1 to 5)
- `importance` (Integer, default: 4, scale: 1 to 5)
- `estimated_hours_needed` (Float, default: 2.0)
- `priority_score` (Float, calculated: 0.0 to 100.0)
- `explanation` (Text, natural language rationale string)
- `explanation_factors_json` (Text, JSON factor breakdown)
- `status` (String(30), default: "in_progress")
- `created_at` (DateTime, UTC timestamp)

### Table: `study_sessions`
- `id` (Integer, Primary Key)
- `profile_id` (Integer, Foreign Key: `student_profiles.id`, nullable=False)
- `subject_id` (Integer, Foreign Key: `subjects.id`, nullable=False)
- `topic_id` (Integer, Foreign Key: `topics.id`, nullable=False)
- `title` (String(200), nullable=False)
- `session_type` (String(50), values: "study", "practice", "revision")
- `date` (String(30), format: "YYYY-MM-DD")
- `start_time` (String(20), format: "HH:MM")
- `end_time` (String(20), format: "HH:MM")
- `duration_minutes` (Integer, default: 60)
- `is_completed` (Boolean, default: False)
- `is_missed` (Boolean, default: False)
- `status` (String(30), values: "pending", "completed", "missed")
- `completed_at` (String(50), nullable=True)
- `notes` (Text, default: "")
- `priority_rank` (Integer, default: 1)
- `rationale` (Text, generated explanation)

---

## 4. Scheduling Engine Logic (`backend/scheduler.py`)

### 4.1 Priority Scoring: `calculate_priority()` (lines 32–147)
Formula:
$$P(t) = \Big( w_{\text{gap}} \cdot \text{Gap}_{\text{norm}} + w_{\text{imp}} \cdot \text{Imp}_{\text{norm}} + w_{\text{urg}} \cdot U(t) + w_{\text{eff}} \cdot \text{Eff}_{\text{norm}} + w_{\text{work}} \cdot \text{Work}_{\text{norm}} \Big) \times 100$$

Exact Weights & Constants (line 98):
- $w_{\text{gap}} = 0.35$ (35% Knowledge Gap Deficit)
- $w_{\text{imp}} = 0.25$ (25% Curricular Importance Weight)
- $w_{\text{urg}} = 0.20$ (20% Assessment Deadline Urgency)
- $w_{\text{eff}} = 0.10$ (10% Estimated Effort Scope)
- $w_{\text{work}} = 0.10$ (10% Unfinished Workload Ratio)

Normalisation factors:
- `knowledge_gap = 6 - clean_mastery` (line 69), `gap_norm = knowledge_gap / 5.0` in $[0.2, 1.0]$
- `imp_norm = clean_importance / 5.0` (line 73) in $[0.2, 1.0]$
- Deadline Urgency Decay $U(t)$ (lines 76–89):
  - $\le 0\text{ days}: 1.00$
  - $\le 2\text{ days}: 0.95$
  - $\le 4\text{ days}: 0.80$
  - $\le 7\text{ days}: 0.65$
  - $\le 14\text{ days}: 0.45$
  - $\le 21\text{ days}: 0.30$
  - $> 21\text{ days}: 0.15$
- `eff_norm = min(1.0, max(0.2, clean_effort / 4.0))` (line 92)
- `work_norm = min(1.0, max(0.1, unfinished_hours / clean_effort))` (line 95)

### 4.2 Pedagogical Workload Allocation: `calculate_topic_workload()` (lines 149–184)
Decomposes each topic into three cognitive phases:
1. **Concept Foundation (Study):** Scaled strictly to student deficit:
   - Mastery 1: $\text{effort} \times 0.45 \times (\text{importance} / 4.0)$
   - Mastery 2: $\text{effort} \times 0.35 \times (\text{importance} / 4.0)$
   - Mastery 3: $\text{effort} \times 0.25 \times (\text{importance} / 4.0)$
   - Mastery 4: $\text{effort} \times 0.15 \times (\text{importance} / 4.0)$
   - Mastery 5: $0.25\text{h}$ quick refresher
2. **Applied Problem Practice (Practice):**
   - $\text{effort} \times 0.40 \times (1.0 + (5 - \text{mastery}) \times 0.1)$
3. **Spaced Revision (Revision):**
   - $\text{effort} \times 0.20$ (if importance $\ge 3$) else $0.5\text{h}$ baseline

### 4.3 Invariant Constraints in `generate_schedule()` (lines 186–484)
- **Daily Availability Constraint (lines 394–411):** Checks `avail = day_data["total_avail_mins"] - day_data["used_mins"] >= duration`. Scheduled minutes strictly never exceed student's daily availability.
- **Deadline Cutoff Constraint (lines 377–380):** Valid dates filtered via `timeline[d_str]["date"] <= task_deadline`. Zero sessions placed past exam date.
- **Non-Overlapping Interval Allocation (lines 415–436):** Starts at base minute 540 (09:00 AM) and scans existing interval tuples $(s_i, e_i)$ to insert sessions into collision-free gaps.
- **Spaced Revision Clustering (lines 386–389):** Reverses candidate date search for revision tasks (`list(reversed(valid_dates))`) so revisions automatically land in the final 1–3 days prior to the deadline.
- **History Preservation Invariant (lines 230–242):** Locks completed sessions (`s.is_completed == True`), blocks out their intervals on the timeline, and recalculates only remaining uncompleted and missed tasks.

---

## 5. Machine Learning, LLM, or External API Usage

**NO.** There are **ZERO** neural network models, **ZERO** LLM API calls, and **ZERO** third-party AI services used.
- **Evidence:** Inspection of `backend/main.py`, `backend/scheduler.py`, `requirements.txt`, and `frontend/package.json` confirms no `openai`, `anthropic`, `transformers`, `torch`, `google-generativeai`, or external cloud AI packages are imported or called.
- The project implements **Honest AI Transparency**, using pure deterministic Multi-Objective Constrained Optimization and Multi-Day Knapsack Allocation.

---

## 6. Pre-Configured Demo Personas (`backend/demo_data.py`)

### 1. Govind Innani (Beginner Persona)
- **Target Exam:** VIT Semester 2 - Core CS Foundation
- **Preferred Session:** 45 minutes
- **Daily Availability:** Mon–Thu: 2.0h, Fri: 2.5h, Sat: 3.0h, Sun: 2.5h (**Total: 16.0h/week**)
- **Subjects & Deadlines:**
  - *Data Structures & Algorithms* (`CSE2001`, Deadline: +5 days):
    - Dynamic Programming (Mastery: 1, Importance: 5)
    - Graph Traversal & Shortest Path (Mastery: 2, Importance: 5)
    - Binary Search Trees (Mastery: 3, Importance: 4)
    - Arrays & Strings (Mastery: 4, Importance: 3)
  - *Discrete Mathematics* (`MAT2002`, Deadline: +6 days):
    - Recurrence Relations & Generating Functions (Mastery: 1, Importance: 4)
    - Graph Theory & Trees (Mastery: 2, Importance: 4)
    - Combinatorics & Permutations (Mastery: 3, Importance: 4)
    - Propositional & Predicate Logic (Mastery: 4, Importance: 3)

### 2. Lakshy Kesharwani (Intermediate Persona)
- **Target Exam:** VIT AI & Data Engineering Mid-Term
- **Preferred Session:** 60 minutes
- **Daily Availability:** Mon: 3.5h, Tue: 3.0h, Wed: 3.5h, Thu: 3.0h, Fri: 4.0h, Sat: 4.5h, Sun: 4.0h (**Total: 25.5h/week**)
- **Subjects & Deadlines:**
  - *Machine Learning Foundations* (`AIML3001`, Deadline: +7 days):
    - Gradient Descent & Adam Optimizer (Mastery: 2, Importance: 5)
    - Regularization: L1, L2 & Dropout (Mastery: 3, Importance: 4)
    - Linear & Logistic Regression (Mastery: 4, Importance: 4)
    - Evaluation Metrics: ROC-AUC & F1 (Mastery: 4, Importance: 3)
  - *Database Systems* (`CSE3002`, Deadline: +9 days):
    - Query Optimization & B-Tree Indexing (Mastery: 2, Importance: 5)
    - ACID Transactions & Concurrency Locks (Mastery: 3, Importance: 5)
    - Relational Normalization 1NF to BCNF (Mastery: 4, Importance: 4)
  - *Computer Networks* (`CSE3003`, Deadline: +11 days):
    - TCP Congestion Control & Flow Control (Mastery: 2, Importance: 4)
    - Subnetting, CIDR & NAT Routing (Mastery: 4, Importance: 3)

### 3. Adhiranshu Singh (Advanced Persona)
- **Target Exam:** GATE CS & Distributed Systems Assessment
- **Preferred Session:** 60 minutes
- **Daily Availability:** Mon–Wed: 4.0h, Thu: 4.0h, Fri: 4.5h, Sat: 5.0h, Sun: 5.0h (**Total: 30.5h/week**)
- **Subjects & Deadlines:**
  - *Advanced Distributed Systems* (`CSE4001`, Deadline: +4 days):
    - Raft Consensus & Distributed Log Replication (Mastery: 4, Importance: 5)
    - Distributed Hash Tables & Consistent Hashing (Mastery: 4, Importance: 4)
    - Vector Clocks & Causality (Mastery: 5, Importance: 5)
  - *Deep Learning Systems* (`AIML4002`, Deadline: +5 days):
    - Multi-Head Self-Attention & Transformers (Mastery: 4, Importance: 5)
    - Diffusion Models & Score-based Generative AI (Mastery: 3, Importance: 4)
    - Quantization (FP16/INT8) & Model Pruning (Mastery: 4, Importance: 4)

---

## 7. Frontend Pages & Components (`frontend/src/components/`)

1. **`Navbar.jsx`:**
   - Displays avatar initials (`G`, `L`, `A`), student name, badge level, and active target exam.
   - Persona switcher dropdown to toggle personas or reset baseline.
   - One-click "Regenerate Plan" button and live backend health heartbeat indicator.
2. **`Sidebar.jsx`:**
   - Persistent navigation across 7 views with active indicator and badge counters.
   - Compact capacity widget showing scheduled hours vs total available hours.
3. **`Dashboard.jsx`:**
   - Hero greeting ("Welcome back, Govind! 👋") with exam target.
   - Capacity deficit warning banner if required study hours exceed availability.
   - 4 metric KPI cards: Curriculum Scope, Weekly Study Hours, Session Completion rate, Nearest Assessment.
   - "Next Recommended Session" card with one-click completion toggle and AI Priority Highlights.
4. **`PlannerCalendar.jsx`:**
   - Interactive multi-day schedule with **Week View** and **Day View**.
   - Filters by Session Type (`All`, `Concept Study`, `Applied Practice`, `Spaced Revision`), Subject, and Status (`All`, `Pending`, `Completed`, `Missed`).
   - Dynamic rescheduling banner that appears when missed sessions exist with 1-click **"⚡ Reschedule Missed Sessions"** trigger.
   - Detailed modal for session inspection showing time interval, AI rationale, and toggles for Complete/Missed.
5. **`StudentProfileView.jsx`:**
   - Student info editor (Name, Email, Target Exam, Preferred Session Duration).
   - Daily study availability hour-input sliders for all 7 days of the week.
   - Full CRUD for Subjects (Name, Code, Color, Assessment Deadline) and Topics (Name, Mastery 1-5 slider, Importance 1-5 slider, Estimated Effort).
6. **`ExplainabilityView.jsx`:**
   - Transparent AI formula breakdown explaining the exact weights.
   - Interactive What-If Priority Simulator with sliders for Mastery, Curricular Importance, and Days to Deadline.
   - Topic-level explainability cards detailing why each topic was prioritized.
7. **`AnalyticsView.jsx`:**
   - Recharts daily workload progression bar chart (Planned vs. Completed hours).
   - Pedagogical phase distribution pie chart (Concept Study, Applied Practice, Spaced Revision).
   - Subject distribution radar chart and topic mastery ranking table.
8. **`DemoTesterView.jsx`:**
   - Persona evaluation cards showing tested invariants for Govind, Lakshy, and Adhiranshu.
   - Interactive Automated Test Suite Runner executing pytest live and showing pass/fail outcomes.
9. **`ArchitectureDocsView.jsx`:**
   - Complete architectural overview, honest AI optimization statement, and UN SDG 4 alignment.

---

## 8. Feature Status Audit Checklist

| Feature | Implementation Status | Notes |
| :--- | :---: | :--- |
| **Profiles** | **IMPLEMENTED** | Multi-persona support with full editing and baseline reset. |
| **Subject & Topic Management** | **IMPLEMENTED** | Full CRUD via REST API and UI with cascade deletion. |
| **Timetable Generation** | **IMPLEMENTED** | Constrained multi-day knapsack scheduler with daily caps. |
| **Explainability (XAI)** | **IMPLEMENTED** | Formula transparency, per-session rationale, and interactive simulator. |
| **Calendar** | **IMPLEMENTED** | Multi-day Week View and Day View with filters and details modal. |
| **Analytics** | **IMPLEMENTED** | Recharts bar, pie, radar charts, and topic mastery ranking table. |
| **Progress Updates** | **IMPLEMENTED** | Session completion tracking with mastery auto-incrementation. |
| **Dynamic Rescheduling** | **IMPLEMENTED** | Locks completed sessions and redistributes remaining/missed tasks. |
| **Database Persistence** | **IMPLEMENTED** | ACID SQLite database (`backend/studysync.db`) surviving cold restarts. |
| **External Calendar Sync (Google/Outlook)** | **NOT IMPLEMENTED** | Documented under future roadmap in architecture docs. |
| **LMS Integration (Canvas/Moodle)** | **NOT IMPLEMENTED** | Documented under future roadmap in architecture docs. |
