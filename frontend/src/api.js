// Base API URL configuration
// In production or when VITE_API_BASE_URL is set, use the configured backend URL
// In local development, falls back to '/api' which is proxied by Vite dev server
const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;
let BASE_URL = '/api';

if (rawBaseUrl && rawBaseUrl.trim()) {
  const trimmed = rawBaseUrl.trim().replace(/\/+$/, '');
  BASE_URL = trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

export { BASE_URL };

export async function checkHealth() {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchProfiles() {
  const res = await fetch(`${BASE_URL}/profiles`);
  if (!res.ok) throw new Error('Failed to load profiles');
  return res.json();
}

export async function fetchProfile(id) {
  const res = await fetch(`${BASE_URL}/profiles/${id}`);
  if (!res.ok) throw new Error(`Failed to load profile ${id}`);
  return res.json();
}

export async function updateProfile(id, data) {
  const res = await fetch(`${BASE_URL}/profiles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update profile');
  return res.json();
}

export async function resetProfile(id) {
  const res = await fetch(`${BASE_URL}/profiles/${id}/reset`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to reset profile');
  return res.json();
}

export async function fetchSessions(profileId, dateStr = null) {
  const url = dateStr 
    ? `${BASE_URL}/sessions?profile_id=${profileId}&date_str=${dateStr}`
    : `${BASE_URL}/sessions?profile_id=${profileId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load sessions');
  return res.json();
}

export async function updateSession(sessionId, payload) {
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to update session');
  return res.json();
}

export async function generateSchedule(profileId, startDate = null, horizonDays = 7, preserveCompleted = true) {
  const res = await fetch(`${BASE_URL}/schedule/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profile_id: profileId,
      start_date: startDate,
      horizon_days: horizonDays,
      preserve_completed: preserveCompleted
    })
  });
  if (!res.ok) throw new Error('Failed to generate schedule');
  return res.json();
}

export async function createSubject(data) {
  const res = await fetch(`${BASE_URL}/subjects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create subject');
  return res.json();
}

export async function deleteSubject(subjectId) {
  const res = await fetch(`${BASE_URL}/subjects/${subjectId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete subject');
  return res.json();
}

export async function updateSubject(subjectId, data) {
  const res = await fetch(`${BASE_URL}/subjects/${subjectId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update subject');
  return res.json();
}

export async function createTopic(data) {
  const res = await fetch(`${BASE_URL}/topics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create topic');
  return res.json();
}

export async function updateTopic(topicId, data) {
  const res = await fetch(`${BASE_URL}/topics/${topicId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update topic');
  return res.json();
}

export async function deleteTopic(topicId) {
  const res = await fetch(`${BASE_URL}/topics/${topicId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete topic');
  return res.json();
}

export async function fetchAnalytics(profileId) {
  const res = await fetch(`${BASE_URL}/analytics/${profileId}`);
  if (!res.ok) throw new Error('Failed to load analytics');
  return res.json();
}

export async function runAutomatedTests() {
  const res = await fetch(`${BASE_URL}/tests/run`);
  if (!res.ok) throw new Error('Failed to run test suite');
  return res.json();
}
