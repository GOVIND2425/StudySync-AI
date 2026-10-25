import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, X, Sparkles, Clock, AlertTriangle, BookOpen, Check } from 'lucide-react';

export default function CreateStudentModal({ isOpen, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [targetExam, setTargetExam] = useState('End-Semester Examination 2026');
  const [preferredMinutes, setPreferredMinutes] = useState(60);
  const [preset, setPreset] = useState('balanced'); // 'light', 'balanced', 'intensive', 'custom'
  const [includeStarterSubject, setIncludeStarterSubject] = useState(true);
  
  const [customAvail, setCustomAvail] = useState({
    Monday: 3.0, Tuesday: 3.0, Wednesday: 3.0, Thursday: 3.0, Friday: 3.5, Saturday: 4.0, Sunday: 3.5
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const presets = {
    light: { label: 'Light', hours: 2.0, desc: '14 hrs/week', map: { Monday: 2.0, Tuesday: 2.0, Wednesday: 2.0, Thursday: 2.0, Friday: 2.0, Saturday: 2.0, Sunday: 2.0 } },
    balanced: { label: 'Balanced', hours: 3.0, desc: '21 hrs/week', map: { Monday: 3.0, Tuesday: 3.0, Wednesday: 3.0, Thursday: 3.0, Friday: 3.0, Saturday: 3.0, Sunday: 3.0 } },
    intensive: { label: 'Intensive', hours: 4.5, desc: '31.5 hrs/week', map: { Monday: 4.5, Tuesday: 4.5, Wednesday: 4.5, Thursday: 4.5, Friday: 4.5, Saturday: 4.5, Sunday: 4.5 } }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Student name is required');
      return;
    }
    setError('');
    setIsSubmitting(true);

    const activeAvail = preset === 'custom' ? customAvail : presets[preset].map;

    try {
      await onCreate({
        name: name.trim(),
        email: email.trim() || undefined,
        target_exam: targetExam.trim(),
        preferred_session_minutes: preferredMinutes,
        daily_availability_json: JSON.stringify(activeAvail),
        include_starter_subject: includeStarterSubject
      });
      // Reset form
      setName('');
      setEmail('');
      setTargetExam('End-Semester Examination 2026');
      setPreferredMinutes(60);
      setPreset('balanced');
      setIncludeStarterSubject(true);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create student profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white font-['Outfit']">Add New Student Profile</h2>
                <p className="text-xs text-slate-400">Create an independent curriculum and adaptive study plan</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Student Name */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Student Full Name <span className="text-indigo-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Priya Sharma"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors text-xs"
              />
            </div>

            {/* Email & Academic Goal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Email <span className="text-slate-500 font-normal">(optional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g., priya@vit.ac.in"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Target Examination</label>
                <input
                  type="text"
                  value={targetExam}
                  onChange={(e) => setTargetExam(e.target.value)}
                  placeholder="e.g., Final Semester Finals"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors text-xs"
                />
              </div>
            </div>

            {/* Preferred Session Length */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Preferred Study Session Duration
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[30, 45, 60, 90].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setPreferredMinutes(mins)}
                    className={`py-2 px-3 rounded-xl border text-center font-medium transition-all cursor-pointer ${
                      preferredMinutes === mins
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm shadow-indigo-500/20'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {mins} mins
                  </button>
                ))}
              </div>
            </div>

            {/* Daily Availability Preset */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Weekly Study Capacity Preset
              </label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(presets).map(([key, val]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPreset(key)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      preset === key
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm shadow-indigo-500/20'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-slate-200">{val.label}</div>
                    <div className="text-[10px] text-indigo-400">{val.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Starter Curriculum Option */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={includeStarterSubject}
                onChange={(e) => setIncludeStarterSubject(e.target.checked)}
                className="mt-0.5 rounded text-indigo-600 focus:ring-0 bg-slate-900 border-slate-700"
              />
              <div className="space-y-0.5">
                <span className="font-semibold text-slate-200">Include starter subjects & topics</span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Automatically adds an introductory Computer Science subject with 3 topics so you can immediately test schedule generation.
                </p>
              </div>
            </label>

            {/* Render Free Ephemeral Alert */}
            <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-slate-300 text-[11px] space-y-1">
              <div className="flex items-center gap-1.5 text-indigo-300 font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Cloud Storage Notice</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[10px]">
                On Render Free tier, the SQLite database is ephemeral. Newly created student profiles will be retained throughout active use but reset to the 3 default baseline personas if the cloud container sleeps or restarts.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold shadow-lg shadow-indigo-600/30 hover:opacity-95 active:scale-95 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create Profile</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
