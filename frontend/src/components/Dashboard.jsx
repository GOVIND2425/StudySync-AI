import React from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, Clock, Calendar, CheckCircle, TrendingUp, AlertTriangle, 
  ArrowRight, Target, Sparkles, Brain, Award, ChevronRight, Zap,
  BookMarked, Star, BarChart2
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4, ease: 'easeOut' } })
};

const sessionTypeMeta = {
  study:    { label: 'Concept Study',    color: '#6366F1', bg: 'bg-indigo-500/15', text: 'text-indigo-300', border: 'border-indigo-500/30' },
  practice: { label: 'Applied Practice', color: '#F59E0B', bg: 'bg-amber-500/15',  text: 'text-amber-300',  border: 'border-amber-500/30'  },
  revision: { label: 'Spaced Revision',  color: '#10B981', bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' },
};

function MasteryBar({ mastery }) {
  return (
    <div className="flex gap-1 items-center">
      {[1, 2, 3, 4, 5].map(lvl => (
        <div
          key={lvl}
          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
            lvl <= mastery
              ? mastery <= 2 ? 'bg-rose-500' : mastery <= 3 ? 'bg-amber-500' : 'bg-emerald-500'
              : 'bg-slate-800'
          }`}
        />
      ))}
    </div>
  );
}

function MetricCard({ label, value, sub, icon: Icon, iconColor, accent, delay }) {
  return (
    <motion.div
      variants={fadeUp}
      custom={delay}
      initial="hidden"
      animate="show"
      className="card-hover p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl"
    >
      <div className="flex items-center justify-between text-slate-400 mb-3">
        <span className="text-xs font-medium">{label}</span>
        <div className={`w-8 h-8 rounded-lg ${accent} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      </div>
      <div className="text-2xl font-bold text-white font-['Outfit']">{value}</div>
      <div className="text-xs text-slate-400 mt-1">{sub}</div>
    </motion.div>
  );
}

export default function Dashboard({
  profile,
  summary,
  analytics,
  sessions,
  onToggleSession,
  onNavigateTab,
  onRegenerate
}) {
  if (!profile || !analytics) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 rounded-2xl shimmer-bg" />
        ))}
      </div>
    );
  }

  const nextSession = sessions.find(s => !s.is_completed) || null;
  const completedToday = sessions.filter(s => s.is_completed).length;
  const upcomingDeadlines = [...(profile.subjects || [])].sort((a, b) =>
    new Date(a.assessment_date) - new Date(b.assessment_date)
  );

  const sessionCounts = { study: 0, practice: 0, revision: 0 };
  sessions.forEach(s => { if (s.session_type in sessionCounts) sessionCounts[s.session_type]++; });
  const totalSess = sessions.length || 1;

  return (
    <div className="space-y-6">

      {/* Hero Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl p-6 sm:p-8 border border-indigo-500/20 shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(49,46,129,0.6) 0%, rgba(76,29,149,0.4) 50%, rgba(15,23,42,0.9) 100%)'
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Smart Personalized Schedule Active</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-['Outfit'] text-white">
              Welcome back, {profile.name.split(' ')[0]}! 👋
            </h1>
            <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
              Targeting <strong className="text-indigo-300">{profile.target_exam}</strong>.
              Your adaptive schedule prioritises weak topics while strictly honouring daily availability.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigateTab('planner')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>View Full Calendar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigateTab('explainability')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 font-medium text-xs transition-all cursor-pointer"
            >
              <Brain className="w-3.5 h-3.5 text-indigo-400" />
              <span>Priority Logic</span>
            </button>
          </div>
        </div>

        {/* Decorative glows */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-violet-600/15 blur-3xl pointer-events-none" />
      </motion.div>

      {/* Capacity Deficit Warning */}
      {summary?.has_capacity_deficit && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3 shadow-lg"
        >
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-amber-300 text-sm">
              Study Capacity Constrained — {summary.capacity_deficit_hours}h deficit
            </div>
            <p className="text-amber-200/90 leading-relaxed">
              Available hours are below optimal workload. StudySync AI has capped the schedule to prevent burnout, prioritising highest-yield topics.
            </p>
          </div>
        </motion.div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Curriculum Scope"
          value={`${profile.subjects?.length || 0} Subjects`}
          sub={`${analytics.topic_data?.length || 0} topics · ${analytics.weak_topics?.length || 0} need focus`}
          icon={BookOpen} iconColor="text-indigo-400" accent="bg-indigo-500/10" delay={0}
        />
        <MetricCard
          label="Weekly Study Hours"
          value={`${summary?.allocated_hours || 0}h`}
          sub={`/ ${summary?.total_available_hours || 0}h available · ${summary?.utilization_rate || 0}% utilised`}
          icon={Clock} iconColor="text-violet-400" accent="bg-violet-500/10" delay={1}
        />
        <MetricCard
          label="Session Completion"
          value={`${analytics.summary?.completion_rate || 0}%`}
          sub={`${analytics.summary?.completed_sessions || 0} of ${analytics.summary?.total_sessions || 0} done`}
          icon={CheckCircle} iconColor="text-emerald-400" accent="bg-emerald-500/10" delay={2}
        />
        <MetricCard
          label="Nearest Assessment"
          value={upcomingDeadlines[0]?.name?.split(' ').slice(0, 2).join(' ') || '—'}
          sub={upcomingDeadlines[0]?.assessment_date || 'No deadlines set'}
          icon={Calendar} iconColor="text-rose-400" accent="bg-rose-500/10" delay={3}
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Next Session + Upcoming List */}
        <div className="lg:col-span-2 space-y-6">

          {/* Recommended Next Session */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                  Next Recommended Session
                </span>
              </div>
              <span className="text-xs text-slate-400">Priority-optimised</span>
            </div>

            {nextSession ? (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-indigo-500/25">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: nextSession.subject_color || '#6366F1' }}
                      />
                      <span className="text-xs font-semibold text-slate-300">{nextSession.subject_name}</span>
                      {(() => {
                        const meta = sessionTypeMeta[nextSession.session_type] || sessionTypeMeta.study;
                        return (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase border ${meta.bg} ${meta.text} ${meta.border}`}>
                            {meta.label}
                          </span>
                        );
                      })()}
                    </div>

                    <h3 className="text-lg font-bold text-white font-['Outfit']">{nextSession.title}</h3>

                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {nextSession.rationale || 'High-priority topic scheduled to reinforce weak concepts.'}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{nextSession.date}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{nextSession.start_time} – {nextSession.end_time} ({nextSession.duration_minutes}m)</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => onToggleSession(nextSession.id, !nextSession.is_completed)}
                      className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        nextSession.is_completed
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                      }`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{nextSession.is_completed ? 'Completed ✓' : 'Mark Complete'}</span>
                    </button>
                    <button
                      onClick={() => onNavigateTab('planner')}
                      className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      View in Planner →
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400 text-sm">
                <Award className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                All sessions completed! Outstanding work.
              </div>
            )}

            {/* AI Highlights */}
            {summary?.explanation_highlights?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-800/80">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-2">
                  <Brain className="w-3.5 h-3.5 text-indigo-400" />
                  <span>AI Priority Highlights</span>
                </div>
                <div className="space-y-2">
                  {summary.explanation_highlights.slice(0, 2).map((hl, i) => (
                    <div key={i} className="text-xs text-slate-400 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80 leading-relaxed">
                      {hl}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Session Type Distribution Mini-Bar */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.4 }}
            className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-white font-['Outfit']">Session Type Allocation</span>
              </div>
              <button onClick={() => onNavigateTab('analytics')} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                Details <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-3">
              {Object.entries(sessionCounts).map(([type, count]) => {
                const meta = sessionTypeMeta[type];
                const pct = Math.round((count / totalSess) * 100);
                return (
                  <div key={type} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
                        <span className="text-slate-300">{meta.label}</span>
                      </div>
                      <span className="text-slate-400">{count} sessions · {pct}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.4, duration: 0.7, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: meta.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Upcoming Sessions List */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white font-['Outfit']">Upcoming Sessions</h3>
              <button
                onClick={() => onNavigateTab('planner')}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
              >
                Full Calendar <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2">
              {sessions.slice(0, 5).map((session, idx) => {
                const meta = sessionTypeMeta[session.session_type] || sessionTypeMeta.study;
                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + idx * 0.05 }}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      session.is_completed
                        ? 'bg-slate-950/30 border-slate-800/30 opacity-60'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => onToggleSession(session.id, !session.is_completed)}
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
                          session.is_completed ? 'bg-emerald-500 text-white' : 'border border-slate-600 hover:border-indigo-400'
                        }`}
                      >
                        {session.is_completed && <CheckCircle className="w-3.5 h-3.5" />}
                      </button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: session.subject_color }} />
                          <span className="text-xs font-semibold text-slate-200 truncate">{session.title}</span>
                          <span className={`hidden sm:inline text-[10px] px-1.5 rounded border ${meta.bg} ${meta.text} ${meta.border}`}>
                            {session.duration_minutes}m
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span>{session.date}</span>
                          <span>·</span>
                          <span>{session.start_time} – {session.end_time}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize font-medium flex-shrink-0 border ${meta.bg} ${meta.text} ${meta.border}`}>
                      {meta.label}
                    </span>
                  </motion.div>
                );
              })}
              {sessions.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No sessions scheduled. Click "Regenerate Plan" to generate your schedule.
                </div>
              )}
            </div>
          </motion.div>

        </div>

        {/* Right: Weak Topics + Deadlines */}
        <div className="space-y-6">

          {/* Weak Topics */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white font-['Outfit'] flex items-center gap-2">
                <Target className="w-4 h-4 text-rose-400" />
                <span>Focus Topics</span>
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold">
                {analytics.weak_topics?.length || 0} weak
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-4">
              Topics with mastery ≤ 2/5 receive amplified study allocation.
            </p>

            <div className="space-y-3">
              {analytics.weak_topics?.slice(0, 4).map((t) => (
                <div key={t.id} className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200 truncate max-w-[160px]">{t.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                      P:{t.priority_score}
                    </span>
                  </div>
                  <MasteryBar mastery={t.mastery} />
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Mastery: {t.mastery}/5</span>
                    <span className="text-slate-300">{t.subject_code}</span>
                  </div>
                </div>
              ))}
              {(!analytics.weak_topics || analytics.weak_topics.length === 0) && (
                <div className="text-center py-6 text-slate-400 text-xs space-y-1">
                  <Star className="w-6 h-6 mx-auto text-emerald-400" />
                  <div>No critical weaknesses! Great mastery across all topics.</div>
                </div>
              )}
            </div>

            <button
              onClick={() => onNavigateTab('profile')}
              className="w-full mt-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
            >
              Update Topic Mastery
            </button>
          </motion.div>

          {/* Assessment Deadlines */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl"
          >
            <h3 className="text-sm font-bold text-white font-['Outfit'] mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Assessment Countdown</span>
            </h3>

            <div className="space-y-3">
              {upcomingDeadlines.map((sub) => {
                const examDate = new Date(sub.assessment_date);
                const diffDays = Math.ceil((examDate - new Date()) / (1000 * 60 * 60 * 24));
                const isUrgent = diffDays <= 4;
                const isPast = diffDays < 0;

                return (
                  <div
                    key={sub.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                      isPast ? 'opacity-40 border-slate-800' :
                      isUrgent ? 'bg-rose-950/20 border-rose-500/25' : 'bg-slate-950/50 border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sub.color }} />
                        <span className="text-xs font-semibold text-slate-200">{sub.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">{sub.assessment_date}</div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                      isPast ? 'bg-slate-800 text-slate-400' :
                      isUrgent ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                      'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    }`}>
                      {isPast ? 'Past' : diffDays === 0 ? 'Today!' : `${diffDays}d left`}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>

        </div>
      </div>

    </div>
  );
}
