import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PlannerCalendar from './components/PlannerCalendar';
import StudentProfileView from './components/StudentProfileView';
import ExplainabilityView from './components/ExplainabilityView';
import AnalyticsView from './components/AnalyticsView';
import DemoTesterView from './components/DemoTesterView';
import ArchitectureDocsView from './components/ArchitectureDocsView';
import { 
  fetchProfiles, fetchProfile, updateProfile, resetProfile,
  fetchSessions, updateSession, generateSchedule,
  createSubject, updateSubject, deleteSubject, createTopic, updateTopic, deleteTopic,
  fetchAnalytics, BASE_URL
} from './api';

export default function App() {
  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(1);
  const [activeProfile, setActiveProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [initError, setInitError] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Initial load
  const loadInitial = async () => {
    setInitError(null);
    setIsLoading(true);
    try {
      const pList = await fetchProfiles();
      setProfiles(pList);
      if (pList.length > 0) {
        await loadProfileData(pList[0].id);
      }
    } catch (err) {
      console.error('Initial load error:', err);
      const isNetworkErr = err?.message?.includes('Failed to fetch') || err?.name === 'TypeError';
      const isRemote = BASE_URL.startsWith('http');
      if (isNetworkErr) {
        setInitError(
          isRemote
            ? `Cannot reach backend at ${BASE_URL}.\n\nIf hosted on Render Free Tier, the backend service may be spinning up from idle sleep (takes ~45–60s on cold start). Please wait a moment and click Retry.`
            : `Cannot connect to local backend at ${BASE_URL}.\nMake sure FastAPI is running on port 8001.`
        );
      } else {
        setInitError(`Failed to load application data: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitial();
  }, []);

  const loadProfileData = async (profileId) => {
    try {
      setActiveProfileId(profileId);
      const [prof, sess, anal] = await Promise.all([
        fetchProfile(profileId),
        fetchSessions(profileId),
        fetchAnalytics(profileId)
      ]);
      setActiveProfile(prof);
      setSessions(sess);
      setAnalytics(anal);

      // Build summary from existing sessions (avoid mutating schedule on every load)
      if (sess.length === 0) {
        // No sessions yet — generate the initial schedule
        const sched = await generateSchedule(profileId, null, 7, true);
        if (sched.summary) setSummary(sched.summary);
        // Reload sessions after generation
        const freshSess = await fetchSessions(profileId);
        setSessions(freshSess);
      } else {
        // Derive summary from fetched sessions
        const totalMins = sess.reduce((a, s) => a + (s.duration_minutes || 0), 0);
        const scheduledHrs = Math.round(totalMins / 60 * 10) / 10;
        // Compute available from profile
        let totalAvail = 0;
        try {
          const avail = JSON.parse(prof.daily_availability_json || '{}');
          totalAvail = Math.round(Object.values(avail).reduce((a, v) => a + v, 0) * 10) / 10;
        } catch { totalAvail = scheduledHrs; }
        const utilRate = totalAvail > 0 ? Math.round((scheduledHrs / totalAvail) * 100) : 0;
        setSummary({
          allocated_hours: scheduledHrs,
          total_available_hours: totalAvail,
          utilization_rate: Math.min(100, utilRate),
          total_sessions_scheduled: sess.length,
          has_capacity_deficit: scheduledHrs > totalAvail,
          capacity_deficit_hours: Math.max(0, Math.round((scheduledHrs - totalAvail) * 10) / 10),
          explanation_highlights: anal?.topic_data?.slice(0, 3).map(t =>
            `${t.name} (${t.subject_code}) – Priority: ${t.priority_score}/100. ${t.explanation || ''}`
          ) || [],
          unmet_topics: []
        });
      }
    } catch (err) {
      console.error('Error loading profile data:', err);
    }
  };


  const handleSelectProfile = async (id) => {
    setIsLoading(true);
    await loadProfileData(id);
    setIsLoading(false);
    showToast(`Switched to ${profiles.find(p => p.id === id)?.name || 'Persona'}`);
  };

  const handleResetDemo = async (id) => {
    try {
      setIsLoading(true);
      await resetProfile(id);
      await loadProfileData(id);
      showToast('Profile restored to initial demo baseline');
    } catch (err) {
      alert('Error resetting demo: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSession = async (sessionId, isCompleted, status = null) => {
    try {
      const payload = status ? { status } : { is_completed: isCompleted };
      await updateSession(sessionId, payload);
      const isComp = status ? status === 'completed' : isCompleted;
      const isMiss = status === 'missed';
      const stat = status || (isCompleted ? 'completed' : 'pending');

      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, is_completed: isComp, is_missed: isMiss, status: stat } : s
      ));
      
      const [anal, prof] = await Promise.all([
        fetchAnalytics(activeProfileId),
        fetchProfile(activeProfileId)
      ]);
      setAnalytics(anal);
      setActiveProfile(prof);
      if (isComp) {
        showToast('Session completed! Mastery progress boosted.');
      } else if (isMiss) {
        showToast('Session marked missed. Click Regenerate to reschedule.');
      }
    } catch (err) {
      console.error('Failed to toggle session:', err);
    }
  };

  const handleRegenerate = async (preserveCompleted = true) => {
    setIsRegenerating(true);
    try {
      const res = await generateSchedule(activeProfileId, null, 7, preserveCompleted);
      if (res.success) {
        setSummary(res.summary);
        setSessions(res.sessions);
        const anal = await fetchAnalytics(activeProfileId);
        setAnalytics(anal);
        showToast(res.message);
      }
    } catch (err) {
      alert('Error generating schedule: ' + err.message);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleUpdateProfile = async (id, data) => {
    await updateProfile(id, data);
    const sched = await generateSchedule(id, null, 7, true);
    if (sched.summary) setSummary(sched.summary);
    if (sched.sessions) setSessions(sched.sessions);
    await loadProfileData(id);
    showToast('Profile & availability updated. Adaptive plan recalculated.');
  };

  const handleCreateSubject = async (data) => {
    await createSubject(data);
    const sched = await generateSchedule(activeProfileId, null, 7, true);
    if (sched.summary) setSummary(sched.summary);
    if (sched.sessions) setSessions(sched.sessions);
    await loadProfileData(activeProfileId);
    showToast('New subject added & schedule updated.');
  };

  const handleUpdateSubject = async (subjectId, data) => {
    await updateSubject(subjectId, data);
    const sched = await generateSchedule(activeProfileId, null, 7, true);
    if (sched.summary) setSummary(sched.summary);
    if (sched.sessions) setSessions(sched.sessions);
    await loadProfileData(activeProfileId);
    showToast('Subject updated & schedule adjusted.');
  };

  const handleDeleteSubject = async (subjectId) => {
    if (!confirm('Are you sure you want to delete this subject and its topics?')) return;
    await deleteSubject(subjectId);
    const sched = await generateSchedule(activeProfileId, null, 7, true);
    if (sched.summary) setSummary(sched.summary);
    if (sched.sessions) setSessions(sched.sessions);
    await loadProfileData(activeProfileId);
    showToast('Subject removed & plan re-balanced.');
  };

  const handleCreateTopic = async (data) => {
    await createTopic(data);
    const sched = await generateSchedule(activeProfileId, null, 7, true);
    if (sched.summary) setSummary(sched.summary);
    if (sched.sessions) setSessions(sched.sessions);
    await loadProfileData(activeProfileId);
    showToast('New topic added & schedule updated.');
  };

  const handleUpdateTopic = async (topicId, data) => {
    await updateTopic(topicId, data);
    const sched = await generateSchedule(activeProfileId, null, 7, true);
    if (sched.summary) setSummary(sched.summary);
    if (sched.sessions) setSessions(sched.sessions);
    const [prof, anal] = await Promise.all([
      fetchProfile(activeProfileId),
      fetchAnalytics(activeProfileId)
    ]);
    setActiveProfile(prof);
    setAnalytics(anal);
  };

  const handleDeleteTopic = async (topicId) => {
    await deleteTopic(topicId);
    const sched = await generateSchedule(activeProfileId, null, 7, true);
    if (sched.summary) setSummary(sched.summary);
    if (sched.sessions) setSessions(sched.sessions);
    await loadProfileData(activeProfileId);
    showToast('Topic deleted & schedule updated.');
  };

  if (isLoading || !activeProfile) {
    // Error state — backend unreachable or API failure
    if (!isLoading && initError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 gap-6 px-6">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shadow-lg shadow-red-500/5">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div className="text-center space-y-3 max-w-lg">
            <div className="text-lg font-bold text-white font-['Outfit']">StudySync AI — Backend Unreachable</div>
            <div className="text-sm text-slate-300 bg-slate-900/80 p-4 rounded-xl border border-slate-800 text-left font-mono text-xs leading-relaxed whitespace-pre-line">
              {initError}
            </div>
            <div className="text-xs text-slate-500">
              Target API: <span className="font-mono text-indigo-400">{BASE_URL}</span>
            </div>
          </div>
          <button
            onClick={loadInitial}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
          >
            <span>🔄</span>
            <span>Retry Connection</span>
          </button>
        </div>
      );
    }

    // Normal loading spinner
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 gap-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-500/30 rounded-full" />
          <div className="absolute inset-0 w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <div className="absolute inset-3 flex items-center justify-center">
            <div className="w-6 h-6 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-full animate-pulse" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <div className="text-base font-bold text-white font-['Outfit']">StudySync AI</div>
          <div className="text-sm text-indigo-300">Initializing Intelligent Planner...</div>
          <div className="text-xs text-slate-500">Algorithmic scheduling engine · SQLite · FastAPI</div>
        </div>
        <div className="w-48 h-1 rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 animate-pulse" />
        </div>
      </div>
    );
  }

  // Extract flat topics list with subject color & code
  const allTopicsWithMeta = [];
  activeProfile.subjects?.forEach(s => {
    s.topics?.forEach(t => {
      allTopicsWithMeta.push({
        ...t,
        subject_name: s.name,
        subject_code: s.code,
        color: s.color,
        deadline: s.assessment_date,
        factors: t.explanation_factors_json ? JSON.parse(t.explanation_factors_json) : {}
      });
    });
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-semibold shadow-2xl shadow-indigo-600/50 flex items-center gap-2"
          >
            <span>✨</span>
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navbar */}
      <Navbar
        profiles={profiles}
        activeProfileId={activeProfileId}
        onSelectProfile={handleSelectProfile}
        onRegenerate={handleRegenerate}
        isRegenerating={isRegenerating}
        activeTab={activeTab}
        onResetDemo={handleResetDemo}
      />

      {/* Main Body */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 flex gap-8">
        
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          summary={summary}
        />

        {/* Dynamic Main Content Tab */}
        <main className="flex-1 min-w-0">
          
          {/* Mobile Tab Bar */}
          <div className="flex md:hidden overflow-x-auto gap-2 pb-3 mb-4 scrollbar-none">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'planner', label: 'Planner' },
              { id: 'profile', label: 'Curriculum' },
              { id: 'explainability', label: 'AI Explain' },
              { id: 'analytics', label: 'Analytics' },
              { id: 'evaluator', label: 'Tests' },
              { id: 'architecture', label: 'Docs' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-900 text-slate-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'dashboard' && (
            <Dashboard
              profile={activeProfile}
              summary={summary}
              analytics={analytics}
              sessions={sessions}
              onToggleSession={handleToggleSession}
              onNavigateTab={setActiveTab}
              onRegenerate={handleRegenerate}
            />
          )}

          {activeTab === 'planner' && (
            <PlannerCalendar
              sessions={sessions}
              subjects={activeProfile.subjects || []}
              summary={summary}
              onToggleSession={handleToggleSession}
              onRegenerate={handleRegenerate}
              isRegenerating={isRegenerating}
            />
          )}

          {activeTab === 'profile' && (
            <StudentProfileView
              profile={activeProfile}
              onUpdateProfile={handleUpdateProfile}
              onCreateSubject={handleCreateSubject}
              onUpdateSubject={handleUpdateSubject}
              onDeleteSubject={handleDeleteSubject}
              onCreateTopic={handleCreateTopic}
              onUpdateTopic={handleUpdateTopic}
              onDeleteTopic={handleDeleteTopic}
              onRegenerate={handleRegenerate}
            />
          )}

          {activeTab === 'explainability' && (
            <ExplainabilityView
              topics={allTopicsWithMeta}
              subjects={activeProfile.subjects || []}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView
              analytics={analytics}
            />
          )}

          {activeTab === 'evaluator' && (
            <DemoTesterView
              profiles={profiles}
              activeProfileId={activeProfileId}
              onSelectProfile={handleSelectProfile}
              onResetDemo={handleResetDemo}
            />
          )}

          {activeTab === 'architecture' && (
            <ArchitectureDocsView />
          )}

        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>StudySync AI – Intelligent Personalised Study Planner</span>
          <span>VIT AI Innovate-A-Thon 2026 • Problem Statement 7</span>
        </div>
      </footer>

    </div>
  );
}
