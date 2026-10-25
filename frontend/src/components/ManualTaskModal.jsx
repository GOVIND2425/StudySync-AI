import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Check, Calendar, Clock, Tag, Flag, BookOpen, 
  FileText, Trash2, Plus, Sparkles, Layers, AlertCircle
} from 'lucide-react';

const CATEGORIES = [
  { id: 'study', label: 'Concept Study', icon: '📖', color: 'indigo' },
  { id: 'practice', label: 'Applied Practice', icon: '🎯', color: 'amber' },
  { id: 'revision', label: 'Spaced Revision', icon: '🔄', color: 'emerald' },
  { id: 'assignment', label: 'Assignment / Homework', icon: '📝', color: 'blue' },
  { id: 'mock_test', label: 'Mock Test / Exam Prep', icon: '⏱️', color: 'rose' },
  { id: 'custom', label: 'Custom Task', icon: '⭐', color: 'violet' }
];

const PRIORITIES = [
  { id: 'low', label: 'Low', color: 'border-slate-700 bg-slate-800/40 text-slate-300' },
  { id: 'medium', label: 'Medium', color: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300' },
  { id: 'high', label: 'High', color: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
  { id: 'critical', label: 'Critical', color: 'border-rose-500/40 bg-rose-500/10 text-rose-300' }
];

const DURATION_PRESETS = [30, 45, 60, 90, 120];

export default function ManualTaskModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialTask = null,
  subjects = [],
  defaultDate = ''
}) {
  const isEditing = Boolean(initialTask && initialTask.id);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('study');
  const [priority, setPriority] = useState('medium');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title || '');
      setDescription(initialTask.description || '');
      setCategory(initialTask.category || 'study');
      setPriority(initialTask.priority || 'medium');
      setDate(initialTask.date || defaultDate || new Date().toISOString().split('T')[0]);
      setStartTime(initialTask.start_time || '09:00');
      setDurationMinutes(initialTask.duration_minutes || 60);
      setSubjectId(initialTask.subject_id ? String(initialTask.subject_id) : '');
      setTopicId(initialTask.topic_id ? String(initialTask.topic_id) : '');
      setNotes(initialTask.notes || '');
    } else {
      setTitle('');
      setDescription('');
      setCategory('study');
      setPriority('medium');
      setDate(defaultDate || new Date().toISOString().split('T')[0]);
      setStartTime('09:00');
      setDurationMinutes(60);
      setSubjectId('');
      setTopicId('');
      setNotes('');
    }
    setError('');
    setShowDeleteConfirm(false);
  }, [initialTask, defaultDate, isOpen]);

  // Compute calculated end time
  const computeEndTime = () => {
    try {
      const [h, m] = startTime.split(':').map(Number);
      const totalMins = (h * 60 + m) + Number(durationMinutes);
      const endH = Math.floor(totalMins / 60) % 24;
      const endM = totalMins % 60;
      return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  const selectedSubject = subjects.find(s => String(s.id) === String(subjectId));
  const availableTopics = selectedSubject?.topics || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a task title');
      return;
    }
    if (!date) {
      setError('Please select a valid date');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        date,
        start_time: startTime,
        end_time: computeEndTime(),
        duration_minutes: Number(durationMinutes),
        subject_id: subjectId ? Number(subjectId) : null,
        topic_id: topicId ? Number(topicId) : null,
        notes: notes.trim()
      };

      await onSave(payload, initialTask?.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialTask?.id) return;
    try {
      setIsSubmitting(true);
      await onDelete(initialTask.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to delete task');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-950/80 backdrop-blur-md">
        
        {/* Backdrop click to close */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="fixed inset-0"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 z-10 my-8 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Accent Glow Header */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-amber-500" />

          {/* Modal Header */}
          <div className="flex items-start justify-between pb-4 border-b border-slate-800 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Tag className="w-4 h-4" />
                </span>
                <h3 className="text-lg font-bold text-white font-['Outfit']">
                  {isEditing ? 'Edit Manual Task' : 'Create New Manual Task'}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Manual tasks are preserved during AI rescheduling and reserve time in daily capacity.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Task Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g., Complete Applied Physics Problem Set 3"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Category selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border text-left transition cursor-pointer ${
                      category === cat.id
                        ? 'border-indigo-500 bg-indigo-500/15 text-white shadow-sm shadow-indigo-500/20'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span className="truncate">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Date, Start Time, Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Date <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Duration (mins)
                </label>
                <input
                  type="number"
                  min="5"
                  max="480"
                  step="5"
                  value={durationMinutes}
                  onChange={e => setDurationMinutes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>

            {/* Duration presets & time preview */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400">Presets:</span>
                {DURATION_PRESETS.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDurationMinutes(preset)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                      Number(durationMinutes) === preset
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {preset}m
                  </button>
                ))}
              </div>
              <div className="text-[11px] font-medium text-indigo-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Slot: {startTime} – {computeEndTime()} ({durationMinutes} mins)</span>
              </div>
            </div>

            {/* Priority Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Priority Level
              </label>
              <div className="grid grid-cols-4 gap-2">
                {PRIORITIES.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriority(p.id)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border text-center transition cursor-pointer ${
                      priority === p.id
                        ? `${p.color} ring-1 ring-current`
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Subject & Topic linkage */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Subject <span className="text-[10px] text-slate-400">(Optional)</span>
                </label>
                <select
                  value={subjectId}
                  onChange={e => {
                    setSubjectId(e.target.value);
                    setTopicId('');
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="">None / General Task</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Specific Topic <span className="text-[10px] text-slate-400">(Optional)</span>
                </label>
                <select
                  disabled={!subjectId}
                  value={topicId}
                  onChange={e => setTopicId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 disabled:opacity-40 cursor-pointer"
                >
                  <option value="">None / Whole Subject</option>
                  {availableTopics.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes / Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Task Details & Notes <span className="text-[10px] text-slate-400">(Optional)</span>
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Include key problem numbers, textbook pages, reference links or reminders..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition resize-none"
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
              {isEditing ? (
                <div>
                  {showDeleteConfirm ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-rose-400 font-medium">Confirm delete?</span>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isSubmitting}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition cursor-pointer"
                      >
                        Yes, Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs hover:text-white transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 text-xs font-semibold transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 disabled:opacity-50 transition cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Task')}</span>
                </button>
              </div>
            </div>

          </form>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
