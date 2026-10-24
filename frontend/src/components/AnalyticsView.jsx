import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, TrendingUp, CheckCircle, Clock, Award, BookOpen
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  Legend, PieChart, Pie, Cell, CartesianGrid, RadarChart, 
  PolarGrid, PolarAngleAxis, Radar
} from 'recharts';

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4, ease: 'easeOut' } })
};

const CustomBarTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 shadow-xl text-xs space-y-1">
        <p className="font-bold text-white">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} style={{ color: entry.color }}>
            {entry.name}: <strong>{entry.value}h</strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

function MasteryBars({ mastery, color }) {
  return (
    <div className="flex gap-0.5 items-center">
      {[1, 2, 3, 4, 5].map(lvl => (
        <div
          key={lvl}
          className="h-2.5 flex-1 rounded-sm transition-all duration-300"
          style={{ backgroundColor: lvl <= mastery ? (color || '#6366F1') : '#1e293b' }}
        />
      ))}
    </div>
  );
}

export default function AnalyticsView({ analytics }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!analytics) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-32 rounded-2xl shimmer-bg" />)}
      </div>
    );
  }

  const { summary, subject_allocation, topic_data, daily_chart_data, session_types } = analytics;

  // Build radar data from subjects
  const radarData = subject_allocation.map(s => ({
    subject: s.code,
    planned: s.planned_hours,
    completed: s.completed_hours
  }));

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'topics', label: 'Topic Mastery' },
    { id: 'subjects', label: 'Subject Breakdown' },
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-xl font-extrabold text-white font-['Outfit'] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <span>Study Analytics & Performance Intelligence</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Planned vs. completed hours, subject distribution, and mastery velocity.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-slate-950/60 border border-slate-800">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === t.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Planned Hours',    value: `${summary.total_planned_hours}h`, sub: `${summary.total_sessions} sessions total`,      icon: Clock,        color: 'text-indigo-400', bg: 'bg-indigo-500/10', delay: 0 },
          { label: 'Completed Hours',  value: `${summary.completed_hours}h`,     sub: `${summary.completed_sessions} sessions done`,    icon: CheckCircle,  color: 'text-emerald-400', bg: 'bg-emerald-500/10', delay: 1 },
          { label: 'Remaining Load',   value: `${summary.remaining_hours}h`,     sub: `${summary.pending_sessions ?? (summary.total_sessions - summary.completed_sessions)} pending${summary.missed_sessions ? ` · ${summary.missed_sessions} missed` : ''}`,   icon: TrendingUp,   color: 'text-amber-400',  bg: 'bg-amber-500/10',  delay: 2 },
          { label: 'Completion Rate',  value: `${summary.completion_rate}%`,     sub: 'Current curriculum progress',                    icon: Award,        color: 'text-violet-400', bg: 'bg-violet-500/10', delay: 3 },
        ].map(({ label, value, sub, icon: Icon, color, bg, delay }) => (
          <motion.div
            key={label}
            variants={fadeUp}
            custom={delay}
            initial="hidden"
            animate="show"
            className="card-hover p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">{label}</span>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className={`text-2xl font-bold font-['Outfit'] ${color}`}>{value}</div>
            <div className="text-xs text-slate-400 mt-1">{sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <motion.div
          key="overview"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Daily Progress Chart */}
          <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white font-['Outfit']">
                Planned vs. Completed Daily Workload
              </h3>
              <p className="text-xs text-slate-400">Tracking daily capacity utilization</p>
            </div>
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily_chart_data} margin={{ top: 8, right: 8, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#475569" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#475569" tick={{ fontSize: 10 }} unit="h" />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="planned_hours" name="Planned" fill="#6366F1" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="completed_hours" name="Completed" fill="#10B981" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Session Type Pie */}
          <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white font-['Outfit']">Pedagogical Allocation</h3>
              <p className="text-xs text-slate-400">Study · Practice · Revision</p>
            </div>
            <div className="h-48 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={session_types}
                    dataKey="hours"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={4}
                  >
                    {session_types.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v, n) => [`${v}h`, n]}
                    contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 pt-2 border-t border-slate-800">
              {session_types.map((st, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: st.color }} />
                    <span className="text-slate-300">{st.name}</span>
                  </div>
                  <span className="font-semibold text-white">{st.hours}h</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Topic Mastery Tab */}
      {activeTab === 'topics' && (
        <motion.div
          key="topics"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-['Outfit'] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              Topic Mastery Matrix
            </h3>
            <span className="text-xs text-slate-400">{topic_data.length} topics tracked</span>
          </div>

          <div className="space-y-2.5">
            {topic_data.map((t, idx) => {
              const masteryColor = t.mastery <= 2 ? '#f43f5e' : t.mastery === 3 ? '#f59e0b' : '#10b981';
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center gap-3">
                    {/* Color dot */}
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-semibold text-white truncate">{t.name}</span>
                          <span className="text-[10px] px-1.5 rounded bg-slate-800 text-slate-400 flex-shrink-0">{t.subject_code}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                            P:{t.priority_score}
                          </span>
                          <span className="text-xs font-bold" style={{ color: masteryColor }}>
                            {t.mastery}/5
                          </span>
                        </div>
                      </div>
                      <MasteryBars mastery={t.mastery} color={masteryColor} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Subject Breakdown Tab */}
      {activeTab === 'subjects' && (
        <motion.div
          key="subjects"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Radar chart */}
          {radarData.length > 0 && (
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl">
              <h3 className="text-sm font-bold text-white font-['Outfit'] mb-4">Subject Hour Distribution (Radar)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#1e293b" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Radar name="Planned" dataKey="planned" stroke="#6366F1" fill="#6366F1" fillOpacity={0.2} />
                    <Radar name="Completed" dataKey="completed" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Subject Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subject_allocation.map((sub, i) => {
              const pct = sub.planned_hours > 0
                ? Math.round((sub.completed_hours / sub.planned_hours) * 100)
                : 0;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="card-hover p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: sub.color }} />
                      <span className="text-xs font-bold text-white font-['Outfit'] truncate max-w-[140px]">{sub.name}</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">{sub.code}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Planned: <strong className="text-slate-200">{sub.planned_hours}h</strong></span>
                    <span>Done: <strong className="text-emerald-400">{sub.completed_hours}h</strong></span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.3 + i * 0.06, duration: 0.7, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: sub.color || '#6366F1' }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{sub.topic_count} Topics · {pct}% complete</span>
                    <span className="text-slate-300">{sub.deadline}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

    </div>
  );
}
