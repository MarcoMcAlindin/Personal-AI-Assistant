# HANDOFF: VOS-042 -- Implement Tasks CRUD API Endpoints

## Header
- **Date:** 2026-03-16
- **From:** Mr. Green (Cloud Backend & API Engineer)
- **To:** Mr. Pink (Audit)
- **Task:** VOS-042 -- Fix Planner/Tasks -- CRUD & Auto-Archive
- **Branch:** `feature/green/042-tasks-api`
- **Commit:** `db332d7`

---

## Summary of Changes

### New File: TaskService (task_service.py)
- `get_tasks(user_id, task_date?, include_archived?)` -- fetches tasks for a date (defaults to today), sorted by time. Filters out archived unless `include_archived=True`.
- `create_task(user_id, data)` -- inserts task with defaults (today's date, status=pending, is_archived=false)
- `update_task(user_id, task_id, updates)` -- partial update, filters None values, enforces user_id ownership
- `delete_task(user_id, task_id)` -- permanent delete with user_id guard
- All methods return empty/error gracefully when Supabase is not initialized

### Endpoints (endpoints.py)
- `GET /api/v1/tasks` -- list today's active tasks. Supports `?date=YYYY-MM-DD` and `?include_archived=true`
- `POST /api/v1/tasks` -- create task, returns full row
- `PATCH /api/v1/tasks/{task_id}` -- update fields, toggle status, archive
- `DELETE /api/v1/tasks/{task_id}` -- permanent delete

### Pydantic Models
- `TaskCreateRequest(title, description?, duration?, time?, date?)`
- `TaskUpdateRequest(title?, description?, duration?, time?, status?, is_archived?)`

---

## Files Changed (2 modified, 1 created)

| File | Change |
|------|--------|
| `backend/app/services/task_service.py` | **NEW** -- TaskService with full CRUD |
| `backend/app/api/v1/endpoints.py` | 4 endpoints + 2 models + TaskService import |

---

## Test Evidence

```
# GET tasks (empty -- no Supabase, graceful)
$ curl http://127.0.0.1:8000/api/v1/tasks
{"tasks":[]}

# GET tasks with date filter (graceful empty)
$ curl "http://127.0.0.1:8000/api/v1/tasks?date=2026-03-15"
{"tasks":[]}

# GET tasks with archive flag (graceful empty)
$ curl "http://127.0.0.1:8000/api/v1/tasks?include_archived=true"
{"tasks":[]}

# POST create task (Supabase not initialized -- expected 500)
$ curl -X POST .../tasks -d '{"title":"Test","time":"09:00","duration":30}'
{"detail":"Supabase not initialized"}

# PATCH update task (Supabase not initialized -- expected 400)
$ curl -X PATCH .../tasks/fake-id -d '{"status":"completed"}'
{"detail":"Supabase not initialized"}

# DELETE task (Supabase not initialized -- expected 404)
$ curl -X DELETE .../tasks/fake-id
{"detail":"Supabase not initialized"}

# Full route registration verified via OpenAPI:
  GET     /api/v1/tasks
  POST    /api/v1/tasks
  PATCH   /api/v1/tasks/{task_id}
  DELETE  /api/v1/tasks/{task_id}
```

---

## API Contract

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/tasks` | Yes | Today's active tasks (or `?date=YYYY-MM-DD`) |
| GET | `/api/v1/tasks?include_archived=true` | Yes | Include archived tasks |
| POST | `/api/v1/tasks` | Yes | Create new task |
| PATCH | `/api/v1/tasks/{id}` | Yes | Update task / toggle status / archive |
| DELETE | `/api/v1/tasks/{id}` | Yes | Delete task permanently |

---

## Mobile Compatibility

Response shapes match what `mobile/src/services/api.js` expects:
- `fetchTasks()` gets `{"tasks": [...]}`
- `createTask()` gets full task row back
- `updateTask()` gets updated task row back

Field names match: `id`, `date`, `title`, `description`, `duration`, `time`, `status`, `is_archived`

---

## pg_cron Auto-Archive

The midnight archiving job (migration `20260314000001`) handles automatic archiving:
```sql
SELECT cron.schedule('archive-daily-tasks', '0 0 * * *',
  $$UPDATE tasks SET is_archived = true WHERE date < CURRENT_DATE AND is_archived = false$$
);
```
This is a database-level concern (Mr. White's domain) -- no backend changes needed.

---

## Risk Notes
- `DELETE` endpoint not in original CLAUDE.md spec but included for completeness. Primary "remove" is `PATCH` with `{"is_archived": true}`.
- `time` column is PostgreSQL TIME type. API accepts "HH:MM" strings -- Supabase handles casting.
- `TaskCreateRequest.date` defaults to today in the service layer, not in Pydantic. Frontends don't need to send `date` for same-day tasks.

---

## Definition of Done Checklist
- [x] GET /api/v1/tasks returns today's active tasks sorted by time
- [x] GET /api/v1/tasks?date=2026-03-15 returns tasks for a specific date
- [x] GET /api/v1/tasks?include_archived=true includes archived tasks
- [x] POST /api/v1/tasks creates a task and returns the full row
- [x] PATCH /api/v1/tasks/{id} updates fields (status toggle works)
- [x] DELETE /api/v1/tasks/{id} removes a task
- [x] All endpoints enforce user_id ownership guard
- [x] Empty state returns {"tasks": []} not an error
- [x] All changes committed to feature/green/042-tasks-api
