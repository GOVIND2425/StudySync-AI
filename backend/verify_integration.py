import httpx

client = httpx.Client(base_url='http://127.0.0.1:8000')

# 1. Health check
health = client.get('/api/health').json()
print('1. Health check:', health['status'])

# 2. Get profiles
profiles = client.get('/api/profiles').json()
names = [p['name'] for p in profiles]
print(f'2. Profiles loaded: {len(profiles)} profiles -> {names}')

# 3. Get profile 1 details
p1 = client.get('/api/profiles/1').json()
print(f'3. Profile 1 ({p1["name"]}) has {len(p1["subjects"])} subjects')

# 4. Get sessions
sessions = client.get('/api/sessions?profile_id=1').json()
print(f'4. Scheduled sessions for Govind: {len(sessions)} sessions')

# 5. Mark session complete
if sessions:
    sid = sessions[0]['id']
    upd = client.put(f'/api/sessions/{sid}', json={'is_completed': True}).json()
    print(f'5. Updated session {sid}: completed={upd["session"]["is_completed"]}')

# 6. Test rescheduling with preservation
resched = client.post('/api/schedule/generate', json={'profile_id': 1, 'preserve_completed': True}).json()
print('6. Reschedule success:', resched['success'], '| Total scheduled hours:', resched['summary']['allocated_hours'])

# 7. Get analytics
analytics = client.get('/api/analytics/1').json()
print('7. Analytics: Completion rate:', analytics['summary']['completion_rate'], '% | Weak topics count:', analytics['summary']['weak_topics_count'])

# 8. Run automated tests endpoint
tests = client.get('/api/tests/run').json()
print('8. Automated test runner via API: all_passed =', tests['all_passed'], f'({tests.get("tests_run")} tests executed)')
for t in tests.get('test_details', []):
    print(f'   - {t["name"]}: {t["status"]}')
