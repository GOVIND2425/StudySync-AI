import React from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, CalendarDays, GraduationCap, Brain, 
  BarChart3, CheckCheck, FileText, Sparkles, AlertTriangle
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, summary }) {
  const navItems = [
    { id: 'dashboard',      label: 'Dashboard',            icon: LayoutDashboard, badge: null },
    { id: 'planner',        label: 'Interactive Planner',  icon: CalendarDays,    badge: summary?.total_sessions_scheduled ? `${summary.total_sessions_scheduled}` : null },
    { id: 'profile',        label: 'Curriculum & Setup',   icon: GraduationCap,   badge: null },
    { id: 'explainability', label: 'AI Explainability',    icon: Brain,           badge: 'XAI' },
    { id: 'analytics',      label: 'Study Analytics',      icon: BarChart3,       badge: null },
    { id: 'evaluator',      label: 'Tests & Evaluation',   icon: CheckCheck,      badge: '6/6' },
    { id: 'architecture',   label: 'Architecture & SDG 4', icon: FileText,        badge: null },
  ];

  return (
    <aside className="w-60 flex-shrink-0 hidden md:block">
      <div className="sticky top-20 flex flex-col gap-4">

        {/* Navigation */}
        <nav className="flex flex-col gap-0.5 p-2 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
          <div className="px-3 py-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
            Navigation
          </div>
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.3 }}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600/90 to-violet-600/90 text-white shadow-md shadow-indigo-600/20 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* Capacity Widget */}
        {summary && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="p-4 rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-950 border border-slate-800 text-xs"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 font-medium">Weekly Capacity</span>
              <span className="text-indigo-400 font-bold">{summary.utilization_rate}%</span>
            </div>

            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mb-3">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, summary.utilization_rate)}%` }}
                transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
              />
            </div>

            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Scheduled: <strong className="text-slate-200">{summary.allocated_hours}h</strong></span>
              <span>Cap: <strong className="text-slate-200">{summary.total_available_hours}h</strong></span>
            </div>

            {summary.has_capacity_deficit && (
              <div className="mt-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-400" />
                <span>Deficit: {summary.capacity_deficit_hours}h backlogged</span>
              </div>
            )}
          </motion.div>
        )}

        {/* VIT Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="p-3.5 rounded-2xl bg-indigo-950/20 border border-indigo-900/30 text-[11px] text-slate-400"
        >
          <div className="flex items-center gap-1.5 text-indigo-300 font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>VIT AI Innovate-A-Thon 2026</span>
          </div>
          <p className="text-slate-500 text-[10px] leading-relaxed">
            Problem 7 · Constrained Multi-Objective Study Optimizer with Explainable AI
          </p>
        </motion.div>

      </div>
    </aside>
  );
}
