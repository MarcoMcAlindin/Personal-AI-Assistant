# SENDOFF: VOS-042 — Implement Tasks API (CRUD & Auto-Archive Verification)

## Header
- **Date:** 2026-03-16
- **From:** Mr. Pink (Scout & Auditor)
- **To:** Mr. Green (Cloud Backend & API Engineer)
- **Task:** VOS-042 — Fix Planner/Tasks — CRUD & Auto-Archive
- **Branch:** `feature/green/042-tasks-api`
- **Priority:** HIGH
- **Depends on:** VOS-039 (CORS/auth must be merged first)

---

## Context

The Tasks/Planner API endpoints **do not exist in the backend**. Zero task routes are implemented in `endpoints.py`. The CLAUDE.md spec lists `GET/POST /tasks` and `PATCH /tasks/:id` as required routes, and both frontends are already built to consume them:

**Mobile** (`mobile/src/services/api.js`, lines 73-100):
- `fetchTasks()` → `GET /api/v1/tasks`
- `createTask(task)` → `POST /api/v1/tasks`
- `updateTask(id, updates)` → `PATCH /api/v1/tasks/{id}`

**Web** (`web/src/services/taskService.ts`):
- Currently bypasses the backend entirely and goes **direct to Supabase** using `supabase.from('tasks')`. This is an architecture violation — all data access should go through the FastAPI gateway. However, fixing the web service layer is Blue's job. Your job is to build the backend endpoints so that the mobile app works and the web app CAN be migrated.

The `tasks` table exists in Supabase (migration `20260314000000`) with columns:
- `id` (UUID, PK)
- `user_id` (UUID, FK to auth.users)
- `date` (DATE)
- `title` (TEXT)
- `description` (TEXT, nullable)
- `duration` (INTEGER, nullable — minutes)
- `time` (TIME, nullable)
- `status` (TEXT — 'pending' or 'completed')
- `is_archived` (BOOLEAN, default false)

The `pg_cron` midnight job (migration `20260314000001`) already handles auto-archiving by setting `is_archived=true` on all active tasks at midnight.

---

## Mission

### Step 1: Add Pydantic Models

**File:** `backend/app/api/v1/endpoints.py` — Add these request models near the top (after line 36):

```python
class TaskCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    duration: Optional[int] = None  # minutes
    time: Optional[str] = None      # HH:MM format
    date: Optional[str] = None      # YYYY-MM-DD, defaults to today

class TaskUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[int] = None
    time: Optional[str] = None
    status: Optional[str] = None    # 'pending' or 'completed'
    is_archived: Optional[bool] = None
```

### Step 2: Create Task Service

**File:** Create `backend/app/services/task_service.py`

```python
# SuperCyan — Task Service
# CRUD operations for the daily planner

import os
from datetime import date
from typing import List, Dict, Optional
from supabase import create_client, Client


class TaskService:
    def __init__(self):
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if url and key:
            self.supabase: Client = create_client(url, key)
        else:
            self.supabase = None

    async def get_tasks(self, user_id: str, task_date: str = None, include_archived: bool = False) -> List[Dict]:
        """Fetch tasks for a given date (defaults to today)."""
        if not self.supabase:
            return []

        target_date = task_date or date.today().isoformat()
        query = self.supabase.table("tasks") \
            .select("id, date, title, description, duration, time, status, is_archived") \
            .eq("user_id", user_id) \
            .eq("date", target_date)

        if not include_archived:
            query = query.eq("is_archived", False)

        result = query.order("time", desc=False).execute()
        return result.data

    async def create_task(self, user_id: str, data: dict) -> Dict:
        """Create a new task. Defaults to today if no date provided."""
        if not self.supabase:
            return {"error": "Supabase not initialized"}

        row = {
            "user_id": user_id,
            "date": data.get("date") or date.today().isoformat(),
            "title": data["title"],
            "description": data.get("description"),
            "duration": data.get("duration"),
            "time": data.get("time"),
            "status": "pending",
            "is_archived": False,
        }

        result = self.supabase.table("tasks").insert(row).execute()
        return result.data[0] if result.data else {"error": "Insert failed"}

    async def update_task(self, user_id: str, task_id: str, updates: dict) -> Dict:
        """Update a task's fields. Only non-None fields are applied."""
        if not self.supabase:
            return {"error": "Supabase not initialized"}

        # Filter out None values so we only update what was provided
        filtered = {k: v for k, v in updates.items() if v is not None}
        if not filtered:
            return {"error": "No fields to update"}

        result = self.supabase.table("tasks") \
            .update(filtered) \
            .eq("id", task_id) \
            .eq("user_id", user_id) \
            .execute()

        if not result.data:
            return {"error": "Task not found"}
        return result.data[0]

    async def delete_task(self, user_id: str, task_id: str) -> Dict:
        """Delete a task by ID."""
        if not self.supabase:
            return {"error": "Supabase not initialized"}

        result = self.supabase.table("tasks") \
            .delete() \
            .eq("id", task_id) \
            .eq("user_id", user_id) \
            .execute()

        if not result.data:
            return {"error": "Task not found"}
        return {"deleted": True, "id": task_id}
```

### Step 3: Add Task Endpoints

**File:** `backend/app/api/v1/endpoints.py`

Import the service at the top:
```python
from app.services.task_service import TaskService
```

Instantiate it alongside the other services (after line 16):
```python
task_service = TaskService()
```

Add the endpoints:

```python
# ── Tasks ──────────────────────────────────────────────

@router.get("/tasks")
async def get_tasks(
    date: Optional[str] = None,
    include_archived: bool = False,
    user_id: str = Depends(get_current_user)
):
    """Get tasks for a date (defaults to today). Pass ?include_archived=true for archive view."""
    tasks = await task_service.get_tasks(user_id, task_date=date, include_archived=include_archived)
    return {"tasks": tasks}

@router.post("/tasks")
async def create_task(
    request: TaskCreateRequest,
    user_id: str = Depends(get_current_user)
):
    """Create a new task for the planner."""
    result = await task_service.create_task(user_id, request.model_dump())
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result

@router.patch("/tasks/{task_id}")
async def update_task(
    task_id: str,
    request: TaskUpdateRequest,
    user_id: str = Depends(get_current_user)
):
    """Update a task (toggle status, edit fields, archive)."""
    result = await task_service.update_task(user_id, task_id, request.model_dump())
    if "error" in result:
        if result["error"] == "Task not found":
            raise HTTPException(status_code=404, detail="Task not found")
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: str,
    user_id: str = Depends(get_current_user)
):
    """Delete a task permanently."""
    result = await task_service.delete_task(user_id, task_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result
```

### Step 4: Verify pg_cron Auto-Archive

The midnight archiving job was set up in migration `20260314000001_advanced_ai_and_cron.sql`. You don't need to create this — just verify it exists and is scheduled:

```sql
-- Run in Supabase SQL Editor:
SELECT * FROM cron.job WHERE jobname LIKE '%task%' OR jobname LIKE '%archive%';
```

If the cron job is missing, the migration may not have been applied. The expected SQL is:
```sql
SELECT cron.schedule(
    'archive-daily-tasks',
    '0 0 * * *',  -- midnight daily
    $$UPDATE tasks SET is_archived = true WHERE date < CURRENT_DATE AND is_archived = false$$
);
```

### Step 5: Verify Mobile Compatibility

The mobile app (`mobile/src/services/api.js`) expects these exact response shapes:

**`fetchTasks()` expects:**
```json
{
  "tasks": [
    {
      "id": "uuid",
      "date": "2026-03-16",
      "title": "Review PRD",
      "description": "Check sections 3.5 and 3.6",
      "duration": 30,
      "time": "09:00",
      "status": "pending",
      "is_archived": false
    }
  ]
}
```

**`createTask(task)` sends:**
```json
{
  "title": "New Task",
  "description": "Optional desc",
  "time": "14:00",
  "date": "2026-03-16"
}
```
And expects the created task object back (the full row).

**`updateTask(id, updates)` sends:**
```json
{
  "status": "completed"
}
```
And expects the updated task object back.

The web app's `PlannerHub` component also needs `duration` (integer, minutes) for its format display, and `time` (string, `HH:MM`) for sorting and display.

---

## API Contract (Complete)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/tasks` | Yes | List active tasks for today (or `?date=YYYY-MM-DD`) |
| GET | `/api/v1/tasks?include_archived=true` | Yes | Include archived tasks (for archive view) |
| POST | `/api/v1/tasks` | Yes | Create new task |
| PATCH | `/api/v1/tasks/{id}` | Yes | Update task fields / toggle status |
| DELETE | `/api/v1/tasks/{id}` | Yes | Delete task permanently |

---

## Key Files

| File | What to Do |
|------|-----------|
| `backend/app/services/task_service.py` | **CREATE** — New service with CRUD methods |
| `backend/app/api/v1/endpoints.py` | Add 4 task endpoints + 2 Pydantic models |
| `backend/app/main.py` | No changes needed (router already includes all endpoints) |

---

## Definition of Done

- [ ] `GET /api/v1/tasks` returns today's active tasks sorted by time
- [ ] `GET /api/v1/tasks?date=2026-03-15` returns tasks for a specific date
- [ ] `GET /api/v1/tasks?include_archived=true` includes archived tasks
- [ ] `POST /api/v1/tasks` creates a task and returns the full row
- [ ] `PATCH /api/v1/tasks/{id}` updates fields (status toggle works)
- [ ] `DELETE /api/v1/tasks/{id}` removes a task
- [ ] All endpoints enforce `user_id` ownership guard
- [ ] Empty state returns `{"tasks": []}` not an error
- [ ] pg_cron midnight job confirmed scheduled in Supabase
- [ ] Mobile app can fetch, create, and toggle tasks via the API
- [ ] All changes committed and pushed to `feature/green/042-tasks-api`
- [ ] Handoff Letter submitted with curl test evidence

---

## Verification

```bash
TOKEN="your-supabase-jwt"
BASE="http://localhost:8000/api/v1"

# Create a task
curl -X POST "$BASE/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test task","description":"Created by Green","time":"09:00","duration":30}'

# List today's tasks
curl -H "Authorization: Bearer $TOKEN" "$BASE/tasks"

# Toggle status to completed (use the ID from create response)
curl -X PATCH "$BASE/tasks/<task-id>" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"completed"}'

# Delete it
curl -X DELETE "$BASE/tasks/<task-id>" \
  -H "Authorization: Bearer $TOKEN"

# Verify empty state
curl -H "Authorization: Bearer $TOKEN" "$BASE/tasks"
# Expected: {"tasks": []}
```

---

## Worktree Setup

```bash
cd /home/marco/supercyan-worktrees/green
git fetch origin staging
git rebase origin/staging  # Ensure VOS-039, VOS-040, VOS-041 are included
git checkout -b feature/green/042-tasks-api
```

---

## Risk Notes

- The web app currently bypasses the backend and talks to Supabase directly for tasks (`web/src/services/taskService.ts`). After you build these endpoints, Blue will need to migrate the web planner to use the REST API instead. Your endpoint response shapes must match what the web planner expects — the field names above (`id`, `date`, `title`, `description`, `duration`, `time`, `status`, `is_archived`) are exactly what `taskService.ts` and `PlannerHub` use.
- The `DELETE` endpoint is not in the original CLAUDE.md spec (only `PATCH` for archiving), but the web planner has a "Delete All" feature and the mobile app doesn't use delete. Include it for completeness — archiving via `PATCH` with `{"is_archived": true}` is the primary "remove" mechanism.
- The `time` column is PostgreSQL `TIME` type. Ensure the API accepts `"09:00"` format (without seconds). The Pydantic model uses `Optional[str]` which is fine — Supabase handles the `TIME` casting.
- `TaskCreateRequest.date` defaults to today via Python's `date.today().isoformat()` in the service, not in the Pydantic model. This keeps the request payload simpler for the frontends (they don't need to send `date` for same-day tasks).

---

*Mr. Pink — Scout & Auditor*
*"The planner is the daily heartbeat of SuperCyan. Give it a real backend."*
