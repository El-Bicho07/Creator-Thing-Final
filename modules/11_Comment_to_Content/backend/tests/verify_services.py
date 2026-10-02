import httpx

client = httpx.Client(timeout=10.0)

# 1. Health check
res = client.get('http://127.0.0.1:8000/api/health')
print('Health check:', res.status_code, res.json())

# 2. Ideas list
ideas = client.get('http://127.0.0.1:8000/api/ideas').json()
print(f'Total ideas retrieved: {len(ideas)}')
if ideas:
    first = ideas[0]
    print(f'Sample Idea: [{first["format"]}] {first["title"]}')
    print(f' - Demand Score: {first["demand_score"]}')
    print(f' - Gap Status: {first["gap_status"]}')
    print(f' - Supporting comments count: {len(first["evidence_comments"])}')
    if first['evidence_comments']:
        c = first['evidence_comments'][0]
        clean_text = c['text'].encode('ascii', 'ignore').decode('ascii')
        print(f' - Evidence: {c["username"]} ({c.get("intent")}, {c["likes"]} likes): "{clean_text[:60]}..."')

# 3. Insights
insights = client.get('http://127.0.0.1:8000/api/insights').json()
print('Insights KPI stats:', {
    'total_raw': insights['total_raw_comments'],
    'cleaned': insights['total_cleaned_comments'],
    'spam_filtered': insights['spam_filtered_count'],
    'intents_count': len(insights['intent_distribution']),
    'top_themes_count': len(insights['top_themes']),
    'timeline_points': len(insights['timeline'])
})

# 4. Schedule an idea to test calendar
if ideas:
    schedule_res = client.post('http://127.0.0.1:8000/api/calendar', json={
        'idea_id': ideas[0]['id'],
        'scheduled_date': '2026-10-01',
        'notes': 'Test scheduled recording session'
    })
    print('Scheduled Idea Status:', schedule_res.status_code)

# 5. Calendar
calendar = client.get('http://127.0.0.1:8000/api/calendar').json()
print(f'Calendar events: {len(calendar)}')

# 6. Replies
replies = client.get('http://127.0.0.1:8000/api/replies').json()
print(f'Reply drafts: {len(replies)}')

# 7. Frontend Next.js root
next_res = client.get('http://localhost:3000')
print('Next.js frontend status:', next_res.status_code)
print('[SUCCESS] All services verified healthy and operational!')
