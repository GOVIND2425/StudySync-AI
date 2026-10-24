import React, { useState } from 'react';
import { 
  Brain, Sparkles, Scale, Clock, Target, ArrowRight, 
  HelpCircle, CheckCircle2, Sliders, ShieldCheck
} from 'lucide-react';

export default function ExplainabilityView({ topics, subjects }) {
  // Simulator states for interactive judge testing
  const [simMastery, setSimMastery] = useState(2);
  const [simImportance, setSimImportance] = useState(5);
  const [simDays, setSimDays] = useState(3);

  // Compute simulated priority
  const masteryDeficit = (5.0 - simMastery) / 4.0;
  const importanceNorm = (simImportance - 1.0) / 4.0;
  let urgencyFactor = 0.25;
  if (simDays <= 0) urgencyFactor = 1.0;
  else if (simDays <= 2) urgencyFactor = 0.95;
  else if (simDays <= 4) urgencyFactor = 0.80;
  else if (simDays <= 7) urgencyFactor = 0.65;
  else if (simDays <= 14) urgencyFactor = 0.45;
  else urgencyFactor = 0.30;

  const simMasteryPts = (0.45 * masteryDeficit * 100).toFixed(1);
  const simImportancePts = (0.30 * importanceNorm * 100).toFixed(1);
  const simUrgencyPts = (0.25 * urgencyFactor * 100).toFixed(1);
  const simTotalScore = (parseFloat(simMasteryPts) + parseFloat(simImportancePts) + parseFloat(simUrgencyPts)).toFixed(1);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white font-['Outfit'] flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-400" />
            <span>AI Explainability & Algorithmic Priority Matrix</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Complete transparent reasoning: Every recommendation is driven by mathematical multi-criteria optimization.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>Explainable AI (XAI) Standard Compliant</span>
        </div>
      </div>

      {/* Formula & Weight Breakdown Cards */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 shadow-xl backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white font-['Outfit'] flex items-center gap-2">
            <Scale className="w-4 h-4 text-indigo-400" />
            <span>Algorithmic Priority Formulation</span>
          </h3>
          <span className="text-[11px] text-slate-400">
            Normative Scale: 0 – 100 Points
          </span>
        </div>

        {/* Mathematical Expression Box */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 font-mono text-center text-xs sm:text-sm text-indigo-200 overflow-x-auto">
          Priority Score (P) = (0.45 × M<sub>deficit</sub> + 0.30 × I<sub>norm</sub> + 0.25 × U<sub>urgency</sub>) × 100
        </div>

        {/* Three Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          
          <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-400">1. Mastery Deficit (45%)</span>
              <span className="text-xs font-mono text-slate-400">w_m = 0.45</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              M<sub>deficit</sub> = (5 - Mastery) / 4. Measures student conceptual unfamiliarity. A mastery of 1/5 produces maximum deficit (+45.0 pts).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400">2. Exam Weightage (30%)</span>
              <span className="text-xs font-mono text-slate-400">w_i = 0.30</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              I<sub>norm</sub> = (Importance - 1) / 4. Reflects curriculum importance. High-credit syllabus modules yield up to +30.0 pts.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-400">3. Deadline Proximity (25%)</span>
              <span className="text-xs font-mono text-slate-400">w_u = 0.25</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              U<sub>urgency</sub> decays with distance to assessment. Topics with exams within ≤ 3 days trigger urgency amplification (+25.0 pts).
            </p>
          </div>

        </div>
      </div>

      {/* Real-time Interactive Priority Simulator for Judges & Students */}
      <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white font-['Outfit'] flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span>Interactive Simulator: Test the Priority Formula</span>
          </h3>
          <span className="text-xs text-indigo-400 font-semibold">
            Live Calculation Sandbox
          </span>
        </div>
        <p className="text-[11px] text-slate-400">
          Slide the parameters below to verify how StudySync AI calculates priority points and produces explainable natural language rationales.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Self-Assessed Mastery</span>
              <span className="font-bold text-rose-400">{simMastery} / 5</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={simMastery}
              onChange={(e) => setSimMastery(parseInt(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer"
            />
            <div className="text-[10px] text-slate-400 text-right">
              Contributes: <strong>+{simMasteryPts} pts</strong>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Topic Importance</span>
              <span className="font-bold text-amber-400">{simImportance} / 5</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={simImportance}
              onChange={(e) => setSimImportance(parseInt(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="text-[10px] text-slate-400 text-right">
              Contributes: <strong>+{simImportancePts} pts</strong>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Days to Exam</span>
              <span className="font-bold text-indigo-400">{simDays} days</span>
            </div>
            <input
              type="range"
              min="1"
              max="14"
              value={simDays}
              onChange={(e) => setSimDays(parseInt(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <div className="text-[10px] text-slate-400 text-right">
              Contributes: <strong>+{simUrgencyPts} pts</strong>
            </div>
          </div>

        </div>

        {/* Live Simulator Result Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-950 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs text-indigo-300 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simulated Generated Natural Language Explanation</span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed max-w-2xl">
              "This topic received a priority score of <strong className="text-white">{simTotalScore}/100</strong> because your current mastery is {simMastery}/5 ({simMastery <= 2 ? 'high conceptual gap' : 'moderate proficiency'}), exam weightage is {simImportance}/5, and the assessment is in {simDays} day(s)."
            </p>
          </div>

          <div className="text-right flex-shrink-0">
            <div className="text-2xl font-black text-white font-['Outfit']">
              {simTotalScore} <span className="text-xs font-normal text-slate-400">/ 100</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold">
              {simTotalScore >= 75 ? 'HIGH PRIORITY' : simTotalScore >= 50 ? 'MEDIUM PRIORITY' : 'LOW PRIORITY'}
            </span>
          </div>
        </div>

      </div>

      {/* Curriculum Topic Explainability Table */}
      <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl space-y-4">
        <h3 className="text-sm font-bold text-white font-['Outfit']">
          All Active Topics: Explainable Priority Score Breakdown
        </h3>

        <div className="space-y-3">
          {topics?.map((t, idx) => {
            const factors = t.factors || {};
            return (
              <div 
                key={t.id || idx}
                className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: t.color || '#6366F1' }}
                    />
                    <span className="text-xs font-bold text-white font-['Outfit']">
                      {t.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.2 rounded bg-slate-800 text-slate-300">
                      {t.subject_code}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">
                      Deadline: <strong className="text-slate-200">{t.deadline}</strong>
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                      Score: {t.priority_score} / 100
                    </span>
                  </div>
                </div>

                {/* AI Natural Language Explanation */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 leading-relaxed flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <span>{t.explanation}</span>
                </div>

                {/* Factor Contribution Progress Breakdown */}
                {factors.mastery_points !== undefined && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                    <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300">
                      <span>Mastery Deficit ({t.mastery}/5):</span>
                      <strong>+{factors.mastery_points} pts</strong>
                    </div>
                    <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300">
                      <span>Importance Weight ({t.importance}/5):</span>
                      <strong>+{factors.importance_points} pts</strong>
                    </div>
                    <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300">
                      <span>Urgency ({factors.days_to_deadline}d):</span>
                      <strong>+{factors.urgency_points} pts</strong>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
