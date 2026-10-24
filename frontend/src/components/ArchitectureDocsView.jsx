import React from 'react';
import { 
  FileText, Cpu, Database, Award, BookOpen, Layers, 
  Sparkles, CheckCircle2, ShieldCheck, HeartHandshake, AlertCircle
} from 'lucide-react';

export default function ArchitectureDocsView() {
  return (
    <div className="space-y-6 max-w-5xl">
      
      {/* Header */}
      <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl">
        <h2 className="text-xl font-extrabold text-white font-['Outfit'] flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-400" />
          <span>System Architecture & Academic Alignment</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          VIT AI Innovate-A-Thon 2026 • Problem 7: Intelligent Personalised Study Planner
        </p>
      </div>

      {/* Honest AI Transparency Box */}
      <div className="p-6 rounded-3xl bg-indigo-950/30 border border-indigo-500/30 backdrop-blur-xl space-y-3">
        <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
          <ShieldCheck className="w-5 h-5 text-indigo-400" />
          <span>Honest AI Transparency: Optimization vs. Machine Learning</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          In strict compliance with the hackathon guidelines, <strong>StudySync AI</strong> does not mislabel a deterministic heuristic as a deep learning neural network. The core planner is a <strong>multi-objective constrained optimization engine</strong> combining:
        </p>
        <ul className="text-xs text-slate-300 space-y-1.5 pl-4 list-disc">
          <li><strong>Multi-Criteria Priority Scoring:</strong> Weighted factor decomposition incorporating topic mastery deficit, curricular importance, and hyperbolic time decay to deadlines.</li>
          <li><strong>Constrained Multi-Day Knapsack Allocation:</strong> Provably guarantees that scheduled hours never exceed daily availability while enforcing zero post-deadline sessions.</li>
          <li><strong>Sequential Pedagogical Phasing:</strong> Concept Foundation (Deep Study) → Applied Practice → Spaced Revision.</li>
        </ul>
      </div>

      {/* Architecture Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Frontend Layer */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
            <Layers className="w-4 h-4" />
            <span>Frontend Presentation Layer</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Built using modern <strong>React 19, Vite, and Tailwind CSS</strong> with custom glassmorphism and royal indigo styling.
          </p>
          <div className="space-y-1.5 text-xs text-slate-300">
            <div>• <strong>Framer Motion:</strong> Fluid micro-transitions and layout morphing.</div>
            <div>• <strong>Recharts:</strong> High-performance interactive data visualization.</div>
            <div>• <strong>Canvas Confetti:</strong> Positive reinforcement upon session completion.</div>
            <div>• <strong>Lucide React:</strong> Semantic visual iconography.</div>
          </div>
        </div>

        {/* Backend & Persistence Layer */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-violet-400 font-bold text-sm">
            <Database className="w-4 h-4" />
            <span>Backend & Data Persistence Layer</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Powered by <strong>FastAPI (Python)</strong> and <strong>SQLAlchemy ORM with SQLite</strong> for ACID-compliant persistence.
          </p>
          <div className="space-y-1.5 text-xs text-slate-300">
            <div>• <strong>Relational Schema:</strong> StudentProfile, Subject, Topic, StudySession.</div>
            <div>• <strong>Pydantic v2:</strong> Strict request/response validation schemas.</div>
            <div>• <strong>Pytest Suite:</strong> Automated invariant verification engine.</div>
            <div>• <strong>Dynamic Rescheduling:</strong> Preserves completed session history.</div>
          </div>
        </div>

      </div>

      {/* Mathematical Formulation */}
      <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white font-['Outfit'] flex items-center gap-2">
          <Cpu className="w-4 h-4 text-indigo-400" />
          <span>Mathematical Formulation & Scheduling Constraints</span>
        </h3>

        <div className="p-4 rounded-2xl bg-slate-950 font-mono text-xs text-indigo-300 space-y-2 border border-slate-800">
          <div>1. Priority Formulation:</div>
          <div className="pl-4 text-slate-200">
            P(t) = [ 0.45 × ((5 - Mastery(t)) / 4) + 0.30 × ((Importance(t) - 1) / 4) + 0.25 × Urgency(t) ] × 100
          </div>
          <div className="pt-2">2. Daily Availability Constraint:</div>
          <div className="pl-4 text-slate-200">
            ∀ day d ∈ Horizon: ∑ Duration(session_i, d) ≤ AvailableMinutes(d)
          </div>
          <div className="pt-2">3. Assessment Deadline Cutoff:</div>
          <div className="pl-4 text-slate-200">
            ∀ session s on topic t: Date(s) ≤ AssessmentDate(Subject(t))
          </div>
          <div className="pt-2">4. Completed History Invariant:</div>
          <div className="pl-4 text-slate-200">
            ∀ session s with is_completed = True: Locked and preserved during rescheduling.
          </div>
        </div>
      </div>

      {/* UN SDG 4 Alignment */}
      <div className="p-6 rounded-3xl bg-emerald-950/20 border border-emerald-500/20 space-y-3">
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
          <HeartHandshake className="w-5 h-5 text-emerald-400" />
          <span>Alignment with UN SDG 4: Quality Education</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Target 4.4 and Target 4.7 emphasize relevant skills and equitable learning opportunities. Traditional static study timetables cause academic anxiety, cramming, and high drop-out rates when students fall behind.
        </p>
        <p className="text-xs text-slate-300 leading-relaxed">
          <strong>StudySync AI</strong> advances SDG 4 by democratizing personalized executive tutoring:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs text-emerald-200/90">
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/30">
            <strong>Burnout Mitigation:</strong> Daily limits ensure students never schedule unrealistic, exhausting hours.
          </div>
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/30">
            <strong>Equity & Access:</strong> Provides tier-1 cognitive optimization to every student regardless of tutoring budgets.
          </div>
        </div>
      </div>

      {/* Known Limitations & Future Roadmap */}
      <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          <span>Known Limitations & Roadmap</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <strong className="text-white block mb-1">Current Implementation:</strong>
            Fixed daily availability per weekday; single student local SQLite store; manual self-reported topic mastery.
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <strong className="text-white block mb-1">Production Roadmap:</strong>
            Integration with Canvas/Moodle LMS; Google Calendar two-way sync; Bayesian Knowledge Tracing (BKT) to dynamically infer mastery from quiz scores.
          </div>
        </div>
      </div>

    </div>
  );
}
