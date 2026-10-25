import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Clock, CheckCircle2, Filter, RefreshCw, 
  Sparkles, ChevronLeft, ChevronRight, Check, Eye, X, BookOpen,
  AlertCircle, Plus, Edit2, Trash2, Tag, CalendarOff, Layers,
  Compass, BarChart3, Sun, BatteryMedium, AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import ManualTaskModal from './ManualTaskModal';

// --- Date Utilities (Local Time Safe, Zero Timezone Shift) ---

function parseLocalDate(dateStr) {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return new Date(dateStr.getFullYear(), dateStr.getMonth(), dateStr.getDate());
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function formatLocalDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Computes the start of the week (Sunday as first day)
function getStartOfWeek(dateInput) {
  const d = parseLocalDate(dateInput);
  const day = d.getDay(); // 0 is Sunday, 1 is Monday ...
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Generates exactly 7 consecutive days starting from weekStartDate
function getSevenDays(weekStartDate) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), weekStartDate.getDate() + i, 0, 0, 0, 0);
    days.push(formatLocalDate(d));
  }
  return days;
}

const CATEGORY_MAP = {
  study: { label: 'Concept Study', icon: '📖', badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
  practice: { label: 'Applied Practice', icon: '🎯', badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  revision: { label: 'Spaced Revision', icon: '🔄', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  assignment: { label: 'Assignment', icon: '📝', badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  mock_test: { label: 'Mock Test', icon: '⏱️', badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
  custom: { label: 'Custom Task', icon: '⭐', badge: 'bg-violet-500/15 text-violet-300 border-violet-500/30' }
};

const PRIORITY_BADGES = {
  critical: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  high: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  medium: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  low: 'bg-slate-700/40 text-slate-400 border-slate-700'
};

export default function PlannerCalendar({
  sessions = [],
  manualTasks = [],
  subjects = [],
  summary = null,
  activeProfile = null,
  onToggleSession,
  onRegenerate,
  isRegenerating,
  onCreateManualTask,
  onUpdateManualTask,
  onDeleteManualTask,
  onToggleManualTask
}) {
  const [viewMode, setViewMode] = useState('week'); // 'week' | 'day'

  // Determine initial anchor date
  const anchorDateStr = useMemo(() => {
    const dates = [...sessions.map(s => s.date), ...manualTasks.map(t => t.date)].filter(Boolean).sort();
    return dates.length > 0 ? dates[0] : formatLocalDate(new Date());
  }, [sessions, manualTasks]);

  // Current week start state (always a Sunday)
  const [weekStart, setWeekStart] = useState(() => getStartOfWeek(anchorDateStr));
  const [selectedDate, setSelectedDate] = useState(() => anchorDateStr);

  // Filters
  const [sourceFilter, setSourceFilter] = useState('all'); // 'all' | 'ai' | 'manual'
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'study' | ...
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'completed' | 'missed'

  // Modals
  const [selectedDetailModal, setSelectedDetailModal] = useState(null); // session or task
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskModalDefaultDate, setTaskModalDefaultDate] = useState('');
  const [preserveCompleted, setPreserveCompleted] = useState(true);

  // Active profile daily availability
  const dailyAvailability = useMemo(() => {
    const defaults = {
      Sunday: 4.0, Monday: 3.0, Tuesday: 2.5, Wednesday: 3.0,
      Thursday: 2.5, Friday: 4.0, Saturday: 5.0
    };
    try {
      if (activeProfile?.daily_availability_json) {
        return { ...defaults, ...JSON.parse(activeProfile.daily_availability_json) };
      }
    } catch {}
    return defaults;
  }, [activeProfile]);

  // The 7 consecutive dates in chronological order
  const sevenWeekDays = useMemo(() => getSevenDays(weekStart), [weekStart]);

  // Date range label
  const weekRangeLabel = useMemo(() => {
    const first = parseLocalDate(sevenWeekDays[0]);
    const last = parseLocalDate(sevenWeekDays[6]);
    const firstStr = first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const lastStr = last.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${firstStr} – ${lastStr}`;
  }, [sevenWeekDays]);

  // Navigation handlers
  const handlePrevWeek = () => {
    const prev = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() - 7, 0, 0, 0, 0);
    setWeekStart(prev);
    setSelectedDate(formatLocalDate(prev));
  };

  const handleNextWeek = () => {
    const next = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7, 0, 0, 0, 0);
    setWeekStart(next);
    setSelectedDate(formatLocalDate(next));
  };

  const handleToday = () => {
    const today = new Date();
    const todayStart = getStartOfWeek(today);
    setWeekStart(todayStart);
    setSelectedDate(formatLocalDate(today));
  };

  const handlePrevDay = () => {
    const cur = parseLocalDate(selectedDate);
    cur.setDate(cur.getDate() - 1);
    const newStr = formatLocalDate(cur);
    setSelectedDate(newStr);
    if (!sevenWeekDays.includes(newStr)) {
      setWeekStart(getStartOfWeek(cur));
    }
  };

  const handleNextDay = () => {
    const cur = parseLocalDate(selectedDate);
    cur.setDate(cur.getDate() + 1);
    const newStr = formatLocalDate(cur);
    setSelectedDate(newStr);
    if (!sevenWeekDays.includes(newStr)) {
      setWeekStart(getStartOfWeek(cur));
    }
  };

  // Open task modal for new task
  const handleOpenCreateTask = (dateStr = '') => {
    setEditingTask(null);
    setTaskModalDefaultDate(dateStr || selectedDate || sevenWeekDays[0]);
    setIsTaskModalOpen(true);
  };

  // Open task modal for edit
  const handleOpenEditTask = (task, e) => {
    if (e) e.stopPropagation();
    setEditingTask(task);
    setTaskModalDefaultDate(task.date);
    setIsTaskModalOpen(true);
    if (selectedDetailModal) setSelectedDetailModal(null);
  };

  // Task save dispatcher
  const handleSaveTask = async (data, id) => {
    if (id) {
      if (onUpdateManualTask) await onUpdateManualTask(id, data);
    } else {
      if (onCreateManualTask) await onCreateManualTask(data);
    }
  };

  // Task delete dispatcher
  const handleDeleteTask = async (id) => {
    if (onDeleteManualTask) await onDeleteManualTask(id);
    if (selectedDetailModal?.id === id) setSelectedDetailModal(null);
  };

  // Complete toggle dispatcher
  const handleToggleItem = (item, e) => {
    if (e) e.stopPropagation();
    const newStatus = !item.is_completed;
    if (item.source === 'manual') {
      if (onToggleManualTask) onToggleManualTask(item.id, newStatus);
    } else {
      if (onToggleSession) onToggleSession(item.id, newStatus, newStatus ? 'completed' : 'pending');
    }
    if (newStatus) {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.75 } });
    }
    if (selectedDetailModal && selectedDetailModal.id === item.id) {
      setSelectedDetailModal({
        ...selectedDetailModal,
        is_completed: newStatus,
        status: newStatus ? 'completed' : 'pending'
      });
    }
  };

  // Filter items
  const passesFilters = (item) => {
    // Source filter
    if (sourceFilter === 'ai' && item.source === 'manual') return false;
    if (sourceFilter === 'manual' && item.source !== 'manual') return false;

    // Category / Type filter
    if (categoryFilter !== 'all') {
      const cat = item.source === 'manual' ? item.category : item.session_type;
      if (cat !== categoryFilter) return false;
    }

    // Subject filter
    if (subjectFilter !== 'all' && String(item.subject_id) !== String(subjectFilter)) return false;

    // Status filter
    if (statusFilter === 'pending' && (item.is_completed || item.is_missed)) return false;
    if (statusFilter === 'completed' && !item.is_completed) return false;
    if (statusFilter === 'missed' && !item.is_missed) return false;

    return true;
  };

  // Group items by date for the 7 consecutive days
  const weekData = useMemo(() => {
    const result = {};
    let totalWeekAvail = 0;
    let totalWeekScheduled = 0;
    let totalWeekCompleted = 0;
    let totalWeekItems = 0;

    sevenWeekDays.forEach(dStr => {
      const dObj = parseLocalDate(dStr);
      const weekdayName = dObj.toLocaleDateString('en-US', { weekday: 'long' });
      const avail = dailyAvailability[weekdayName] ?? 3.0;

      // Filtered items on this date
      const daySessions = sessions
        .filter(s => s.date === dStr && passesFilters({ ...s, source: 'ai' }))
        .map(s => ({ ...s, source: 'ai' }));

      const dayManual = manualTasks
        .filter(m => m.date === dStr && passesFilters({ ...m, source: 'manual' }))
        .map(m => ({ ...m, source: 'manual' }));

      const allItems = [...daySessions, ...dayManual].sort((a, b) => {
        return (a.start_time || '00:00').localeCompare(b.start_time || '00:00');
      });

      const scheduledMins = allItems.reduce((acc, it) => acc + (it.duration_minutes || 0), 0);
      const scheduledHrs = Math.round(scheduledMins / 60 * 10) / 10;
      const freeCapacity = Math.max(0, Math.round((avail - scheduledHrs) * 10) / 10);
      const isOver = scheduledHrs > avail;
      const completedCount = allItems.filter(it => it.is_completed).length;

      totalWeekAvail += avail;
      totalWeekScheduled += scheduledHrs;
      totalWeekCompleted += completedCount;
      totalWeekItems += allItems.length;

      result[dStr] = {
        dateStr: dStr,
        dateObj: dObj,
        dayName: dObj.toLocaleDateString('en-US', { weekday: 'short' }),
        fullDayName: weekdayName,
        formattedDate: dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        availableHours: avail,
        scheduledHours: scheduledHrs,
        freeCapacityHours: freeCapacity,
        isOverCapacity: isOver,
        utilizationRate: avail > 0 ? Math.min(100, Math.round((scheduledHrs / avail) * 100)) : 0,
        items: allItems,
        completedCount,
        hasMissed: allItems.some(it => it.is_missed)
      };
    });

    return {
      days: result,
      totals: {
        avail: Math.round(totalWeekAvail * 10) / 10,
        scheduled: Math.round(totalWeekScheduled * 10) / 10,
        free: Math.max(0, Math.round((totalWeekAvail - totalWeekScheduled) * 10) / 10),
        items: totalWeekItems,
        completed: totalWeekCompleted,
        rate: totalWeekAvail > 0 ? Math.min(100, Math.round((totalWeekScheduled / totalWeekAvail) * 100)) : 0
      }
    };
  }, [sevenWeekDays, sessions, manualTasks, dailyAvailability, sourceFilter, categoryFilter, subjectFilter, statusFilter]);

  // Missed sessions count
  const totalMissedCount = useMemo(() => {
    return sessions.filter(s => s.is_missed).length + manualTasks.filter(m => m.is_missed).length;
  }, [sessions, manualTasks]);

  // Today string for comparison
  const todayStr = formatLocalDate(new Date());

  return (
    <div className="space-y-6">
      
      {/* ============================================================== */}
      {/* TOP CALENDAR CONTROL BAR                                      */}
      {/* ============================================================== */}
      <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white font-['Outfit'] flex items-center gap-2">
                <span>Interactive Study Planner & Calendar</span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-semibold font-sans">
                  7-Day Chronological
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Full chronological schedule displaying daily available study capacity, AI sessions, and manual tasks.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Add Manual Task Button */}
          <button
            onClick={() => handleOpenCreateTask()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>

          {/* View Mode Toggle: Week vs Day */}
          <div className="flex items-center p-1 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                viewMode === 'week' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Week View
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                viewMode === 'day' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Day View
            </button>
          </div>

          {/* Lock Completed & Reschedule */}
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
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold disabled:opacity-50 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
              <span>{isRegenerating ? 'Optimizing...' : 'Reschedule AI'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* ============================================================== */}
      {/* WEEK / DAY NAVIGATION & SUMMARY BANNER                        */}
      {/* ============================================================== */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Navigation controls */}
        <div className="flex items-center gap-2">
          {viewMode === 'week' ? (
            <>
              <button
                onClick={handlePrevWeek}
                title="Previous 7 Days"
                className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={handleToday}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                  sevenWeekDays.includes(todayStr)
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                Current Week
              </button>

              <button
                onClick={handleNextWeek}
                title="Next 7 Days"
                className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="ml-2 font-bold text-white text-sm font-['Outfit'] flex items-center gap-2">
                <span>{weekRangeLabel}</span>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={handlePrevDay}
                title="Previous Day"
                className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={handleToday}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                  selectedDate === todayStr
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                Today
              </button>

              <button
                onClick={handleNextDay}
                title="Next Day"
                className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="ml-2 font-bold text-white text-sm font-['Outfit']">
                {parseLocalDate(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>
            </>
          )}
        </div>

        {/* Weekly Capacity Breakdown Badges */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Available: <strong className="text-white">{weekData.totals.avail}h</strong></span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
            <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
            <span>Scheduled: <strong className="text-white">{weekData.totals.scheduled}h</strong></span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
            <BatteryMedium className="w-3.5 h-3.5 text-emerald-400" />
            <span>Free Capacity: <strong className="text-emerald-400">{weekData.totals.free}h</strong></span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold">
            <span>{weekData.totals.rate}% Capacity Utilized</span>
          </div>
        </div>

      </div>

      {/* Missed Workload Alert */}
      {totalMissedCount > 0 && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-200 shadow-lg">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>
              You have <strong>{totalMissedCount} missed session(s)/task(s)</strong>. Dynamic rescheduling can redistribute unfinished workload into available study capacity.
            </span>
          </div>
          <button
            onClick={() => onRegenerate(preserveCompleted)}
            disabled={isRegenerating}
            className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold text-xs shadow-md shadow-rose-600/25 transition cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
            <span>⚡ Reschedule Missed</span>
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* FILTER CONTROLS BAR                                            */}
      {/* ============================================================== */}
      <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-400 font-medium">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <span>Filter By:</span>
          </div>

          {/* Source Filter: AI vs Manual */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">All Sources (AI & Manual)</option>
            <option value="ai">🤖 AI Planned Only</option>
            <option value="manual">✏️ Manual Tasks Only</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">All Categories</option>
            <option value="study">📖 Concept Study</option>
            <option value="practice">🎯 Applied Practice</option>
            <option value="revision">🔄 Spaced Revision</option>
            <option value="assignment">📝 Assignment</option>
            <option value="mock_test">⏱️ Mock Test</option>
            <option value="custom">⭐ Custom</option>
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

        {/* Counter */}
        <div className="text-slate-400">
          Showing <strong className="text-white">{weekData.totals.items}</strong> scheduled in selected view
        </div>
      </div>

      {/* ============================================================== */}
      {/* 7-DAY CHRONOLOGICAL WEEK VIEW                                 */}
      {/* ============================================================== */}
      {viewMode === 'week' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-3.5">
          {sevenWeekDays.map((dateStr, idx) => {
            const day = weekData.days[dateStr];
            const isToday = dateStr === todayStr;

            return (
              <motion.div
                key={dateStr}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`flex flex-col rounded-2xl border transition-all duration-200 overflow-hidden backdrop-blur-xl ${
                  isToday
                    ? 'bg-slate-900/90 border-indigo-500/60 ring-1 ring-indigo-500/40 shadow-lg shadow-indigo-500/10'
                    : 'bg-slate-900/60 border-slate-800/90 hover:border-slate-700'
                }`}
              >
                {/* Day Header Card */}
                <div 
                  onClick={() => { setSelectedDate(dateStr); setViewMode('day'); }}
                  className="p-3 bg-slate-950/70 border-b border-slate-800/80 cursor-pointer hover:bg-slate-950 transition flex flex-col gap-1.5"
                  title="Click to view Day Details"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white font-['Outfit']">
                        {day.dayName}
                      </span>
                      {isToday && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-indigo-600 text-white font-semibold">
                          Today
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-slate-300">
                      {day.formattedDate}
                    </span>
                  </div>

                  {/* Daily capacity stats */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-900">
                    <span>Avail: <strong className="text-slate-200">{day.availableHours}h</strong></span>
                    <span>Sched: <strong className="text-indigo-300">{day.scheduledHours}h</strong></span>
                    <span className={day.isOverCapacity ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                      {day.isOverCapacity ? `+${(day.scheduledHours - day.availableHours).toFixed(1)}h over` : `${day.freeCapacityHours}h free`}
                    </span>
                  </div>

                  {/* Capacity progress bar */}
                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-0.5">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        day.isOverCapacity 
                          ? 'bg-rose-500' 
                          : day.utilizationRate >= 80 
                          ? 'bg-amber-500' 
                          : 'bg-indigo-500'
                      }`}
                      style={{ width: `${Math.min(100, day.utilizationRate)}%` }}
                    />
                  </div>
                </div>

                {/* Day Sessions & Tasks List */}
                <div className="p-2.5 space-y-2 flex-1 flex flex-col">
                  
                  {day.items.length === 0 ? (
                    // Complete Calendar Requirement: "Display 'No Sessions Scheduled' on empty days"
                    <div className="flex-1 flex flex-col items-center justify-center py-7 px-2 text-center rounded-xl bg-slate-950/30 border border-dashed border-slate-800/80">
                      <CalendarOff className="w-5 h-5 text-slate-600 mb-1.5" />
                      <div className="text-[11px] font-bold text-slate-400">
                        No Sessions Scheduled
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {day.availableHours}h study capacity free
                      </div>
                      <button
                        onClick={() => handleOpenCreateTask(dateStr)}
                        className="mt-2.5 px-2.5 py-1 rounded-lg bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-300 text-[10px] font-semibold transition cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Task</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      {day.items.map((item) => {
                        const isManual = item.source === 'manual';
                        const catKey = isManual ? (item.category || 'study') : item.session_type;
                        const catInfo = CATEGORY_MAP[catKey] || CATEGORY_MAP.study;

                        return (
                          <div
                            key={`${item.source}-${item.id}`}
                            onClick={() => setSelectedDetailModal(item)}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer group hover:scale-[1.01] ${
                              item.is_completed
                                ? 'bg-slate-950/40 border-slate-800/40 opacity-65'
                                : item.is_missed
                                ? 'bg-rose-950/20 border-rose-500/40'
                                : isManual
                                ? 'bg-slate-900/90 border-slate-700/80 hover:border-violet-500/50 shadow-sm'
                                : 'bg-slate-900/80 border-slate-800 hover:border-indigo-500/40 shadow-sm'
                            }`}
                          >
                            {/* Source & Category Header */}
                            <div className="flex items-center justify-between gap-1 mb-1.5">
                              <div className="flex items-center gap-1 min-w-0">
                                {isManual ? (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30 font-bold uppercase tracking-wider flex items-center gap-0.5">
                                    <span>✏️</span>
                                    <span>Manual</span>
                                  </span>
                                ) : (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 font-bold uppercase tracking-wider">
                                    AI
                                  </span>
                                )}
                                <span className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold truncate ${catInfo.badge}`}>
                                  {catInfo.icon} {catInfo.label}
                                </span>
                              </div>

                              {/* Priority Pill if Manual Task */}
                              {isManual && item.priority && (
                                <span className={`text-[8px] px-1 py-0.2 rounded border uppercase font-bold ${PRIORITY_BADGES[item.priority] || PRIORITY_BADGES.medium}`}>
                                  {item.priority}
                                </span>
                              )}
                            </div>

                            {/* Title */}
                            <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-2 font-['Outfit']">
                              {item.title}
                            </h4>

                            {/* Subject pill */}
                            {item.subject_name && (
                              <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-300 truncate">
                                <span 
                                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: item.subject_color || '#6366F1' }}
                                />
                                <span className="truncate">{item.subject_name}</span>
                              </div>
                            )}

                            {/* Time & Complete Action */}
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-1 border-t border-slate-900">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span>{item.start_time} - {item.end_time}</span>
                              </div>

                              <div className="flex items-center gap-1">
                                {isManual && (
                                  <button
                                    onClick={(e) => handleOpenEditTask(item, e)}
                                    title="Edit Task"
                                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                )}

                                <button
                                  onClick={(e) => handleToggleItem(item, e)}
                                  className={`p-1 rounded transition ${
                                    item.is_completed 
                                      ? 'text-emerald-400 bg-emerald-500/10' 
                                      : 'text-slate-500 hover:text-emerald-400 hover:bg-slate-800'
                                  }`}
                                  title={item.is_completed ? 'Mark incomplete' : 'Mark completed'}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                          </div>
                        );
                      })}

                      {/* Quick Add Button at bottom of day */}
                      <button
                        onClick={() => handleOpenCreateTask(dateStr)}
                        className="w-full py-1 rounded-lg border border-dashed border-slate-800 hover:border-indigo-500/40 text-slate-500 hover:text-indigo-300 text-[10px] font-semibold transition cursor-pointer flex items-center justify-center gap-1 mt-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Task</span>
                      </button>
                    </>
                  )}

                </div>

              </motion.div>
            );
          })}
        </div>
      ) : (
        /* ============================================================== */
        /* SINGLE DAY VIEW                                                */
        /* ============================================================== */
        <div className="space-y-4">
          
          {/* Day Header Banner */}
          {(() => {
            const day = weekData.days[selectedDate] || {
              dayName: 'Day',
              fullDayName: 'Selected Day',
              formattedDate: selectedDate,
              availableHours: 3.0,
              scheduledHours: 0,
              freeCapacityHours: 3.0,
              items: [],
              utilizationRate: 0
            };

            return (
              <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-white font-['Outfit']">
                      {day.fullDayName}, {day.formattedDate}
                    </span>
                    {selectedDate === todayStr && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-600 text-white font-semibold">
                        Today
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Study capacity: <strong>{day.availableHours}h</strong> available • <strong>{day.scheduledHours}h</strong> scheduled • <span className="text-emerald-400"><strong>{day.freeCapacityHours}h</strong> free capacity</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenCreateTask(selectedDate)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Task for Today</span>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Day Item Cards */}
          {(() => {
            const day = weekData.days[selectedDate] || { items: [] };

            if (day.items.length === 0) {
              return (
                <div className="text-center py-16 px-4 rounded-3xl bg-slate-900/40 border border-slate-800">
                  <CalendarOff className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-slate-300 font-['Outfit']">
                    No Sessions or Tasks Scheduled for this Day
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    You have free study capacity on this date. You can add an assignment, practice problems, or let the AI scheduler fill it.
                  </p>
                  <button
                    onClick={() => handleOpenCreateTask(selectedDate)}
                    className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Manual Task</span>
                  </button>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {day.items.map((item) => {
                  const isManual = item.source === 'manual';
                  const catKey = isManual ? (item.category || 'study') : item.session_type;
                  const catInfo = CATEGORY_MAP[catKey] || CATEGORY_MAP.study;

                  return (
                    <div
                      key={`${item.source}-${item.id}`}
                      onClick={() => setSelectedDetailModal(item)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        item.is_completed
                          ? 'bg-slate-950/40 border-slate-800/40 opacity-70'
                          : item.is_missed
                          ? 'bg-rose-950/20 border-rose-500/40 shadow-sm'
                          : isManual
                          ? 'bg-slate-900/90 border-slate-700 hover:border-violet-500/50 shadow-sm'
                          : 'bg-slate-900/80 border-slate-800 hover:border-indigo-500/40 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3.5">
                        {/* Complete Checkbox */}
                        <button
                          onClick={(e) => handleToggleItem(item, e)}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all flex-shrink-0 mt-0.5 sm:mt-0 ${
                            item.is_completed
                              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                              : item.is_missed
                              ? 'border border-rose-500/50 bg-rose-500/10 text-rose-400'
                              : 'border border-slate-600 hover:border-indigo-400 text-transparent'
                          }`}
                        >
                          <Check className="w-4 h-4" />
                        </button>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {isManual ? (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30 font-bold uppercase">
                                ✏️ Manual Task
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 font-bold uppercase">
                                🤖 AI Planned
                              </span>
                            )}

                            <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${catInfo.badge}`}>
                              {catInfo.icon} {catInfo.label}
                            </span>

                            {isManual && item.priority && (
                              <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold ${PRIORITY_BADGES[item.priority] || PRIORITY_BADGES.medium}`}>
                                {item.priority}
                              </span>
                            )}

                            {item.subject_name && (
                              <span className="text-xs text-slate-300 flex items-center gap-1 font-medium">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.subject_color }} />
                                {item.subject_name}
                              </span>
                            )}
                          </div>

                          <h4 className="text-sm font-bold text-white font-['Outfit']">
                            {item.title}
                          </h4>

                          {item.rationale && (
                            <p className="text-xs text-slate-400 mt-1 max-w-2xl line-clamp-1">
                              {item.rationale}
                            </p>
                          )}
                          {item.notes && (
                            <p className="text-xs text-slate-400 mt-1 max-w-2xl line-clamp-1 italic">
                              Note: {item.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-slate-300 pl-9 sm:pl-0">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Clock className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{item.start_time} - {item.end_time} ({item.duration_minutes}m)</span>
                        </div>

                        {isManual && (
                          <button
                            onClick={(e) => handleOpenEditTask(item, e)}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                            title="Edit Task"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <span className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[11px] font-medium">
                          <Eye className="w-3.5 h-3.5" />
                          <span>Details</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

        </div>
      )}

      {/* ============================================================== */}
      {/* SESSION / TASK DETAIL MODAL                                   */}
      {/* ============================================================== */}
      <AnimatePresence>
        {selectedDetailModal && (
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedDetailModal(null)}
          >
            <motion.div
              key="modal-content"
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 8 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-5"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    {selectedDetailModal.source === 'manual' ? (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30 font-bold uppercase">
                        ✏️ Manual Task
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 font-bold uppercase">
                        🤖 AI Planned Session
                      </span>
                    )}

                    {(() => {
                      const cat = selectedDetailModal.source === 'manual' 
                        ? (selectedDetailModal.category || 'study') 
                        : selectedDetailModal.session_type;
                      const info = CATEGORY_MAP[cat] || CATEGORY_MAP.study;
                      return (
                        <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-semibold ${info.badge}`}>
                          {info.icon} {info.label}
                        </span>
                      );
                    })()}

                    {selectedDetailModal.priority && (
                      <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold ${PRIORITY_BADGES[selectedDetailModal.priority] || PRIORITY_BADGES.medium}`}>
                        Priority: {selectedDetailModal.priority}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-white font-['Outfit']">
                    {selectedDetailModal.title}
                  </h3>

                  {selectedDetailModal.subject_name && (
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedDetailModal.subject_color || '#6366F1' }} />
                      <span>{selectedDetailModal.subject_name}</span>
                      {selectedDetailModal.topic_name && (
                        <span className="text-slate-400">• Topic: {selectedDetailModal.topic_name}</span>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setSelectedDetailModal(null)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Time & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2 text-xs text-slate-300">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  <span>{selectedDetailModal.date}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2 text-xs text-slate-300">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span>{selectedDetailModal.start_time} – {selectedDetailModal.end_time} ({selectedDetailModal.duration_minutes}m)</span>
                </div>
              </div>

              {/* Notes or AI Rationale */}
              {selectedDetailModal.source === 'manual' ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-300">
                    <Tag className="w-3.5 h-3.5 text-violet-400" />
                    <span>Task Description & Notes</span>
                  </div>
                  <p className="text-xs text-slate-300 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 leading-relaxed whitespace-pre-wrap">
                    {selectedDetailModal.notes || selectedDetailModal.description || 'No additional notes provided for this task.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>AI Scheduling Rationale</span>
                  </div>
                  <p className="text-xs text-slate-300 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
                    {selectedDetailModal.rationale || 'Prioritized based on mastery gap, curriculum weightage, and deadline proximity.'}
                  </p>
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs">
                  <span className="text-slate-400">Status: </span>
                  {selectedDetailModal.is_completed ? (
                    <span className="text-emerald-400 font-semibold">Completed ✓</span>
                  ) : selectedDetailModal.is_missed ? (
                    <span className="text-rose-400 font-semibold">Missed ✕</span>
                  ) : (
                    <span className="text-amber-400 font-semibold">Pending</span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {selectedDetailModal.source === 'manual' && (
                    <button
                      onClick={() => handleOpenEditTask(selectedDetailModal)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit Task</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleToggleItem(selectedDetailModal)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      selectedDetailModal.is_completed
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                    }`}
                  >
                    {selectedDetailModal.is_completed ? '↩ Mark Incomplete' : '✓ Mark Completed'}
                  </button>
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Task Create / Edit Modal */}
      <ManualTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        initialTask={editingTask}
        subjects={subjects}
        defaultDate={taskModalDefaultDate}
      />

    </div>
  );
}
