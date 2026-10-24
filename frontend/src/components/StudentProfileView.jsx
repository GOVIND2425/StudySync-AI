import React, { useState } from 'react';
import { 
  GraduationCap, Clock, BookOpen, Plus, Trash2, Calendar, 
  Sparkles, Save, CheckCircle, RefreshCw, AlertCircle, Edit3, X, Check
} from 'lucide-react';

export default function StudentProfileView({
  profile,
  onUpdateProfile,
  onCreateSubject,
  onUpdateSubject,
  onDeleteSubject,
  onCreateTopic,
  onUpdateTopic,
  onDeleteTopic,
  onRegenerate
}) {
  const [studentName, setStudentName] = useState(profile?.name || 'Govind Innani');
  const [studentEmail, setStudentEmail] = useState(profile?.email || 'govind.innani@vit.ac.in');
  const [targetExam, setTargetExam] = useState(profile?.target_exam || 'VIT End-Semester Exam 2026');
  const [preferredMinutes, setPreferredMinutes] = useState(profile?.preferred_session_minutes || 60);
  
  const [dailyAvail, setDailyAvail] = useState(() => {
    try {
      return JSON.parse(profile?.daily_availability_json || '{}');
    } catch {
      return { Monday: 3.0, Tuesday: 2.5, Wednesday: 3.0, Thursday: 2.5, Friday: 4.0, Saturday: 5.0, Sunday: 4.0 };
    }
  });

  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCode, setNewSubjectCode] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState('#6366F1');
  const [newSubjectDate, setNewSubjectDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });

  const [newTopicData, setNewTopicData] = useState({});
  const [editingSubjectId, setEditingSubjectId] = useState(null);
  const [editSubjectForm, setEditSubjectForm] = useState({ name: '', code: '', assessment_date: '', color: '#6366F1' });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationError, setValidationError] = useState('');

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleAvailChange = (day, val) => {
    setDailyAvail(prev => ({
      ...prev,
      [day]: Math.max(0, Math.min(12, parseFloat(val) || 0))
    }));
  };

  const handleSaveProfile = async () => {
    if (!studentName.trim()) {
      setValidationError('Student name cannot be empty');
      return;
    }
    setValidationError('');
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onUpdateProfile(profile.id, {
        name: studentName.trim(),
        email: studentEmail.trim(),
        target_exam: targetExam.trim(),
        preferred_session_minutes: preferredMinutes,
        daily_availability_json: JSON.stringify(dailyAvail)
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setValidationError('Failed to save profile: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSubjectSubmit = async (e) => {
    e.preventDefault();
    if (!newSubjectName.trim()) {
      setValidationError('Please enter a valid subject name');
      return;
    }
    setValidationError('');
    try {
      await onCreateSubject({
        profile_id: profile.id,
        name: newSubjectName.trim(),
        code: newSubjectCode.trim() || 'CS100',
        color: newSubjectColor,
        assessment_date: newSubjectDate
      });
      setNewSubjectName('');
      setNewSubjectCode('');
    } catch (err) {
      setValidationError('Failed to add subject: ' + err.message);
    }
  };

  const handleStartEditSubject = (subj) => {
    setEditingSubjectId(subj.id);
    setEditSubjectForm({
      name: subj.name,
      code: subj.code,
      assessment_date: subj.assessment_date,
      color: subj.color
    });
  };

  const handleSaveEditSubject = async (subjId) => {
    if (!editSubjectForm.name.trim()) return;
    try {
      await onUpdateSubject(subjId, editSubjectForm);
      setEditingSubjectId(null);
    } catch (err) {
      setValidationError('Failed to update subject: ' + err.message);
    }
  };

  const handleAddTopicSubmit = async (subjectId) => {
    const data = newTopicData[subjectId] || {};
    const tName = data.name;
    if (!tName || !tName.trim()) return;
    const effort = parseFloat(data.effort) || 2.5;

    try {
      await onCreateTopic({
        subject_id: subjectId,
        name: tName.trim(),
        mastery: 2,
        importance: 4,
        estimated_hours_needed: effort
      });
      setNewTopicData(prev => ({ ...prev, [subjectId]: { name: '', effort: 2.0 } }));
    } catch (err) {
      setValidationError('Failed to add topic: ' + err.message);
    }
  };

  const totalWeeklyHours = Object.values(dailyAvail).reduce((a, b) => a + Number(b), 0);

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white font-['Outfit'] flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-400" />
            <span>Student Profile & Curriculum Management</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure learning goals, daily study availability, subject milestones, and topic-level mastery.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            {saveSuccess ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-300" />
                <span>Saved Successfully!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Parameters'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {validationError && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Student Profile Info & Session Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Student Details Card */}
        <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl space-y-4">
          <h3 className="text-sm font-bold text-white font-['Outfit'] flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-indigo-400" />
            <span>Student Identity</span>
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Student Full Name</label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full text-xs font-semibold text-white bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Academic Email</label>
              <input
                type="email"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                className="w-full text-xs text-slate-300 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Target Examination / Milestone</label>
              <input
                type="text"
                value={targetExam}
                onChange={(e) => setTargetExam(e.target.value)}
                className="w-full text-xs font-medium text-slate-200 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Daily Study Hours Matrix */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-['Outfit'] flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Daily Study Availability (Hours/Day)</span>
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 font-semibold border border-indigo-500/30">
              Total: {totalWeeklyHours.toFixed(1)} hrs/week
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Hard constraints: StudySync AI strictly guarantees that scheduled minutes will never exceed these limits on any day.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 pt-1">
            {daysOfWeek.map((day) => {
              const val = dailyAvail[day] ?? 3.0;
              return (
                <div key={day} className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-1">
                  <div className="text-[11px] font-semibold text-slate-300">
                    {day.slice(0, 3)}
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="14"
                    value={val}
                    onChange={(e) => handleAvailChange(day, e.target.value)}
                    className="w-full text-center text-sm font-bold text-white bg-slate-900 border border-slate-700 rounded-lg py-1 focus:outline-none focus:border-indigo-500"
                  />
                  <div className="text-[10px] text-slate-400">hours</div>
                </div>
              );
            })}
          </div>

          <div className="pt-2">
            <label className="text-xs text-slate-400 block mb-1.5">
              Preferred Session Duration Chunk
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[30, 45, 60, 90].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setPreferredMinutes(mins)}
                  className={`py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    preferredMinutes === mins
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {mins} mins
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Add New Subject Section */}
      <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl">
        <h3 className="text-sm font-bold text-white font-['Outfit'] mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4 text-indigo-400" />
          <span>Add New Subject & Assessment Milestone</span>
        </h3>

        <form onSubmit={handleAddSubjectSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Subject Name</label>
            <input
              type="text"
              placeholder="e.g. Distributed Systems"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Subject Code</label>
            <input
              type="text"
              placeholder="e.g. CSE4001"
              value={newSubjectCode}
              onChange={(e) => setNewSubjectCode(e.target.value)}
              className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Assessment Date</label>
            <input
              type="date"
              value={newSubjectDate}
              onChange={(e) => setNewSubjectDate(e.target.value)}
              className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Color Theme</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={newSubjectColor}
                onChange={(e) => setNewSubjectColor(e.target.value)}
                className="w-8 h-8 rounded-lg border-0 bg-transparent cursor-pointer"
              />
              <span className="text-xs text-slate-400 font-mono">{newSubjectColor}</span>
            </div>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
            >
              + Create Subject
            </button>
          </div>
        </form>
      </div>

      {/* Existing Subjects & Topics List */}
      <div className="space-y-4">
        {profile.subjects?.map((subject) => {
          const isEditing = editingSubjectId === subject.id;

          return (
            <div 
              key={subject.id}
              className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl space-y-4"
            >
              {/* Subject Title & Deadline Header */}
              {isEditing ? (
                <div className="p-4 rounded-2xl bg-slate-950 border border-indigo-500/40 space-y-3">
                  <div className="text-xs font-bold text-indigo-300">Edit Subject Details</div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <input
                      type="text"
                      value={editSubjectForm.name}
                      onChange={(e) => setEditSubjectForm({ ...editSubjectForm, name: e.target.value })}
                      className="text-xs bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                      placeholder="Subject Name"
                    />
                    <input
                      type="text"
                      value={editSubjectForm.code}
                      onChange={(e) => setEditSubjectForm({ ...editSubjectForm, code: e.target.value })}
                      className="text-xs bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                      placeholder="Code"
                    />
                    <input
                      type="date"
                      value={editSubjectForm.assessment_date}
                      onChange={(e) => setEditSubjectForm({ ...editSubjectForm, assessment_date: e.target.value })}
                      className="text-xs bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSaveEditSubject(subject.id)}
                        className="px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" /> Save
                      </button>
                      <button
                        onClick={() => setEditingSubjectId(null)}
                        className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <span 
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: subject.color }}
                    />
                    <div>
                      <h4 className="text-base font-bold text-white font-['Outfit'] flex items-center gap-2">
                        <span>{subject.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-normal">
                          {subject.code}
                        </span>
                      </h4>
                      <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Assessment Deadline: <strong className="text-slate-200">{subject.assessment_date}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStartEditSubject(subject)}
                      className="p-2 rounded-xl text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Edit Subject"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteSubject(subject.id)}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete Subject"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Topics Grid for this subject */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Topics & Estimated Effort Parameters</span>
                  <span className="text-[11px] text-slate-500">{subject.topics?.length || 0} Topics Registered</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {subject.topics?.map((topic) => (
                    <div 
                      key={topic.id}
                      className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/90 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white truncate max-w-[200px]">
                          {topic.name}
                        </span>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold">
                            Score: {topic.priority_score}
                          </span>
                          <button
                            onClick={() => onDeleteTopic(topic.id)}
                            className="text-slate-600 hover:text-rose-400 transition-colors p-1"
                            title="Delete Topic"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Sliders for Mastery, Importance, and Effort */}
                      <div className="space-y-2 text-[11px]">
                        <div>
                          <div className="flex justify-between text-slate-400 mb-1">
                            <span>Mastery Level</span>
                            <span className={`font-bold ${topic.mastery <= 2 ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {topic.mastery} / 5 ({topic.mastery <= 2 ? 'Novice / Weak' : topic.mastery === 3 ? 'Intermediate' : 'Mastered'})
                            </span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={topic.mastery}
                            onChange={(e) => onUpdateTopic(topic.id, { mastery: parseInt(e.target.value) })}
                            className="w-full accent-indigo-500 cursor-pointer"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-slate-400 mb-1">
                            <span>Curricular Importance / Weight</span>
                            <span className="font-bold text-amber-400">
                              {topic.importance} / 5 ({topic.importance >= 4 ? 'High Exam Weight' : 'Standard'})
                            </span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={topic.importance}
                            onChange={(e) => onUpdateTopic(topic.id, { importance: parseInt(e.target.value) })}
                            className="w-full accent-amber-500 cursor-pointer"
                          />
                        </div>

                        {/* Estimated Study Effort Input */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-slate-400">Estimated Total Effort:</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              step="0.5"
                              min="0.5"
                              max="12"
                              value={topic.estimated_hours_needed || 2.0}
                              onChange={(e) => onUpdateTopic(topic.id, { estimated_hours_needed: parseFloat(e.target.value) || 2.0 })}
                              className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-white font-bold text-center text-xs"
                            />
                            <span className="text-slate-400">hours</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Topic Inline Form */}
                <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Enter new topic name..."
                    value={newTopicData[subject.id]?.name || ''}
                    onChange={(e) => setNewTopicData({
                      ...newTopicData,
                      [subject.id]: { ...(newTopicData[subject.id] || {}), name: e.target.value }
                    })}
                    className="flex-1 text-xs bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="10"
                      placeholder="Effort (h)"
                      value={newTopicData[subject.id]?.effort || 2.0}
                      onChange={(e) => setNewTopicData({
                        ...newTopicData,
                        [subject.id]: { ...(newTopicData[subject.id] || {}), effort: e.target.value }
                      })}
                      className="w-24 text-xs bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-white text-center"
                    />
                    <button
                      onClick={() => handleAddTopicSubmit(subject.id)}
                      className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      + Add Topic
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
