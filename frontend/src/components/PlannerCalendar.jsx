import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Clock, CheckCircle2, Filter, RefreshCw, 
  Sparkles, ChevronLeft, ChevronRight, Check, Eye, X, BookOpen,
  AlertCircle, AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function PlannerCalendar({
  sessions,
  subjects,
  summary,
  onToggleSession,
  onRegenerate,
  isRegenerating
}) {
  const [viewMode, setViewMode] = useState('week'); // 'week' | 'day'
  const [selectedDate, setSelectedDate] = useState(() => {
    return sessions.length > 0 ? sessions[0].date : new Date().toISOString().split('T')[0];
  });
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'study' | 'practice' | 'revision'
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'completed' | 'missed'
  const [selectedSessionModal, setSelectedSessionModal] = useState(null);
  const [preserveCompleted, setPreserveCompleted] = useState(true);

  const missedCount = sessions.filter(s => s.is_missed).length;

  // Collect distinct dates from sessions
  const distinctDates = Array.from(new Set(sessions.map(s => s.date))).sort();

  // Filtered sessions
  const filteredSessions = sessions.filter(s => {
    if (typeFilter !== 'all' && s.session_type !== typeFilter) return false;
    if (subjectFilter !== 'all' && String(s.subject_id) !== String(subjectFilter)) return false;
    if (statusFilter === 'pending' && (s.is_completed || s.is_missed)) return false;
    if (statusFilter === 'completed' && !s.is_completed) return false;
    if (statusFilter === 'missed' && !s.is_missed) return false;
    if (viewMode === 'day' && s.date !== selectedDate) return false;
    return true;
  });

  // Group by date for week view
  const sessionsByDate = {};
  filteredSessions.forEach(s => {
    if (!sessionsByDate[s.date]) {
      sessionsByDate[s.date] = [];
    }
    sessionsByDate[s.date].push(s);
  });

  const handleCompleteClick = (session, e) => {
    e.stopPropagation();
    const newStatus = !session.is_completed;
    onToggleSession(session.id, newStatus);
    if (newStatus) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 }
      });
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'study':
        return {
          label: 'Concept Study',
          classes: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
        };
      case 'practice':
        return {
          label: 'Applied Practice',
          classes: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
        };
      case 'revision':
        return {
          label: 'Spaced Revision',
          classes: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
        };
      default:
        return {
          label: type,
          classes: 'bg-slate-500/15 text-slate-300 border-slate-500/30'
        };
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Controls Header */}
      <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white font-['Outfit'] flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <span>Interactive Multi-Day Study Schedule</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Every session is bounded by subject assessment deadlines and daily capacity constraints.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          
          {/* View Mode Toggle: Day vs Week */}
          <div className="flex items-center p-1 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                viewMode === 'week' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Week View
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                viewMode === 'day' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Day View
            </button>
          </div>

          {/* Preserve Completed Checkbox & Regenerate Trigger */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={preserveCompleted}
                onChange={(e) => setPreserveCompleted(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Lock Completed</span>
            </label>

            <button
              onClick={() => onRegenerate(preserveCompleted)}
              disabled={isRegenerating}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
              <span>{isRegenerating ? 'Optimizing...' : 'Reschedule Remaining'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* Missed Sessions Dynamic Rescheduling Alert Banner */}
      {missedCount > 0 && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-200 shadow-lg">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>
              You have <strong>{missedCount} missed session(s)</strong>. Dynamic rescheduling can redistribute this unfinished workload across remaining days.
            </span>
          </div>
          <button
            onClick={() => onRegenerate(preserveCompleted)}
            disabled={isRegenerating}
            className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold text-xs shadow-md shadow-rose-600/25 transition-all cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
            <span>⚡ Reschedule Missed Sessions</span>
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-400 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Session Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">All Session Types</option>
            <option value="study">Concept Study (Deep)</option>
            <option value="practice">Applied Practice</option>
            <option value="revision">Spaced Revision</option>
          </select>

          {/* Subject Filter */}
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">All Subjects</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending Only</option>
            <option value="completed">Completed Only</option>
            <option value="missed">Missed Only</option>
          </select>
        </div>

        {/* Total Matches Count */}
        <div className="text-slate-400">
          Showing <strong className="text-slate-200">{filteredSessions.length}</strong> sessions
        </div>
      </div>

      {/* Day Selector when in Day View */}
      {viewMode === 'day' && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <button
            onClick={() => {
              const idx = distinctDates.indexOf(selectedDate);
              if (idx > 0) setSelectedDate(distinctDates[idx - 1]);
            }}
            disabled={distinctDates.indexOf(selectedDate) <= 0}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="text-center">
            <div className="text-sm font-bold text-white font-['Outfit']">
              {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="text-[11px] text-indigo-400">
              {filteredSessions.length} sessions scheduled
            </div>
          </div>

          <button
            onClick={() => {
              const idx = distinctDates.indexOf(selectedDate);
              if (idx < distinctDates.length - 1) setSelectedDate(distinctDates[idx + 1]);
            }}
            disabled={distinctDates.indexOf(selectedDate) >= distinctDates.length - 1}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Calendar Grid View (Week View or Day View) */}
      {viewMode === 'week' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Object.keys(sessionsByDate).length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-400 text-xs bg-slate-900/40 rounded-3xl border border-slate-800">
              No sessions match the selected filters.
            </div>
          ) : (
            Object.entries(sessionsByDate).map(([dateStr, daySessions]) => {
              const dateObj = new Date(dateStr);
              const dayName = dateObj.toLocaleDateString(undefined, { weekday: 'short' });
              const dayFormatted = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              const totalMins = daySessions.reduce((acc, s) => acc + s.duration_minutes, 0);
              const completedCount = daySessions.filter(s => s.is_completed).length;

              return (
                <motion.div
                  key={dateStr}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * Object.keys(sessionsByDate).indexOf(dateStr) }}
                  className="flex flex-col rounded-2xl bg-slate-900/60 border border-slate-800/90 overflow-hidden backdrop-blur-xl"
                >
                  {/* Day Header */}
                  <div className="p-3.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-white font-['Outfit']">
                        {dayName}, {dayFormatted}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {Math.round(totalMins / 60 * 10) / 10}h scheduled
                      </div>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                      {completedCount}/{daySessions.length}
                    </span>
                  </div>

                  {/* Sessions List */}
                  <div className="p-3 space-y-2.5 flex-1">
                    {daySessions.map((session) => {
                      const badge = getTypeBadge(session.session_type);
                      return (
                        <div
                          key={session.id}
                          onClick={() => setSelectedSessionModal(session)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer group hover:scale-[1.01] ${
                            session.is_completed
                              ? 'bg-slate-950/40 border-slate-800/40 opacity-70'
                              : session.is_missed
                              ? 'bg-rose-950/25 border-rose-500/40 shadow-sm'
                              : 'bg-slate-900/80 border-slate-800 hover:border-indigo-500/40 shadow-sm'
                          }`}
                        >
                          {/* Subject Pill & Type */}
                          <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span 
                                className="w-2 h-2 rounded-full flex-shrink-0" 
                                style={{ backgroundColor: session.subject_color || '#6366F1' }}
                              />
                              <span className="text-[11px] font-semibold text-slate-300 truncate">
                                {session.subject_name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              {session.is_missed && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded border border-rose-500/40 bg-rose-500/20 text-rose-300 font-semibold uppercase">
                                  Missed
                                </span>
                              )}
                              <span className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold uppercase ${badge.classes}`}>
                                {badge.label}
                              </span>
                            </div>
                          </div>

                          {/* Session Title */}
                          <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1 font-['Outfit']">
                            {session.title}
                          </h4>

                          {/* Time & Duration */}
                          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span>{session.start_time} - {session.end_time}</span>
                            </div>

                            <button
                              onClick={(e) => handleCompleteClick(session, e)}
                              className={`p-1 rounded-md transition-colors ${
                                session.is_completed 
                                  ? 'text-emerald-400 bg-emerald-500/10' 
                                  : 'text-slate-500 hover:text-emerald-400 hover:bg-slate-800'
                              }`}
                              title={session.is_completed ? 'Mark incomplete' : 'Mark completed'}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      ) : (
        /* Day View Detailed List */
        <div className="space-y-3">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs bg-slate-900/40 rounded-3xl border border-slate-800">
              No sessions scheduled for this day.
            </div>
          ) : (
            filteredSessions.map((session) => {
              const badge = getTypeBadge(session.session_type);
              return (
                <div
                  key={session.id}
                  onClick={() => setSelectedSessionModal(session)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    session.is_completed
                      ? 'bg-slate-950/40 border-slate-800/40 opacity-70'
                      : session.is_missed
                      ? 'bg-rose-950/25 border-rose-500/40 shadow-sm'
                      : 'bg-slate-900/80 border-slate-800 hover:border-indigo-500/40 shadow-sm'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    <button
                      onClick={(e) => handleCompleteClick(session, e)}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all flex-shrink-0 mt-0.5 sm:mt-0 ${
                        session.is_completed
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                          : session.is_missed
                          ? 'border border-rose-500/50 bg-rose-500/10 text-rose-400'
                          : 'border border-slate-600 hover:border-indigo-400 text-transparent'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                    </button>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span 
                          className="w-2.5 h-2.5 rounded-full" 
                          style={{ backgroundColor: session.subject_color }}
                        />
                        <span className="text-xs font-semibold text-slate-300">
                          {session.subject_name}
                        </span>
                        {session.is_missed && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full border border-rose-500/40 bg-rose-500/20 text-rose-300 font-semibold uppercase">
                            Missed
                          </span>
                        )}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${badge.classes}`}>
                          {badge.label}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-0.5 font-['Outfit']">
                        {session.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-2xl line-clamp-1">
                        {session.rationale}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 text-xs text-slate-300 pl-9 sm:pl-0">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{session.start_time} - {session.end_time} ({session.duration_minutes}m)</span>
                    </div>

                    <span className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[11px] font-medium">
                      <Eye className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Session Details Modal */}
      <AnimatePresence>
        {selectedSessionModal && (
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedSessionModal(null)}
          >
            <motion.div
              key="modal-content"
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-5"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedSessionModal.subject_color }} />
                    <span className="text-xs font-semibold text-slate-300">{selectedSessionModal.subject_name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase font-semibold ${getTypeBadge(selectedSessionModal.session_type).classes}`}>
                      {getTypeBadge(selectedSessionModal.session_type).label}
                    </span>
                    {selectedSessionModal.priority_rank && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/25 font-semibold">
                        Priority #{selectedSessionModal.priority_rank}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-white font-['Outfit']">{selectedSessionModal.title}</h3>
                  {selectedSessionModal.topic_name && (
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
                      <BookOpen className="w-3 h-3 text-slate-500" />
                      <span>Topic: <span className="text-slate-300">{selectedSessionModal.topic_name}</span></span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSelectedSessionModal(null)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Time & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2 text-xs text-slate-300">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  <span>{selectedSessionModal.date}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2 text-xs text-slate-300">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span>{selectedSessionModal.start_time} – {selectedSessionModal.end_time} <span className="text-slate-500">({selectedSessionModal.duration_minutes}m)</span></span>
                </div>
              </div>

              {/* AI Rationale */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>AI Scheduling Rationale</span>
                </div>
                <p className="text-xs text-slate-300 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
                  {selectedSessionModal.rationale || 'Prioritized based on mastery gap, curriculum weightage, and deadline proximity.'}
                </p>
              </div>

              {/* Status Actions */}
              <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs">
                  <span className="text-slate-400">Current Status: </span>
                  {selectedSessionModal.is_completed ? (
                    <span className="text-emerald-400 font-semibold">Completed ✓</span>
                  ) : selectedSessionModal.is_missed ? (
                    <span className="text-rose-400 font-semibold">Missed ✕</span>
                  ) : (
                    <span className="text-amber-400 font-semibold">Pending</span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {!selectedSessionModal.is_completed && (
                    <button
                      onClick={() => {
                        const newMissed = !selectedSessionModal.is_missed;
                        const newStatus = newMissed ? 'missed' : 'pending';
                        onToggleSession(selectedSessionModal.id, false, newStatus);
                        setSelectedSessionModal({ 
                          ...selectedSessionModal, 
                          is_missed: newMissed, 
                          is_completed: false, 
                          status: newStatus 
                        });
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        selectedSessionModal.is_missed
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                          : 'bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700'
                      }`}
                    >
                      {selectedSessionModal.is_missed ? '↩ Unmark Missed' : '✕ Mark Missed'}
                    </button>
                  )}

                  <button
                    onClick={() => {
                      const newStatus = !selectedSessionModal.is_completed;
                      onToggleSession(selectedSessionModal.id, newStatus, newStatus ? 'completed' : 'pending');
                      setSelectedSessionModal({ 
                        ...selectedSessionModal, 
                        is_completed: newStatus, 
                        is_missed: false, 
                        status: newStatus ? 'completed' : 'pending' 
                      });
                      if (newStatus) confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      selectedSessionModal.is_completed
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                    }`}
                  >
                    {selectedSessionModal.is_completed ? '↩ Mark Incomplete' : '✓ Mark Completed'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
