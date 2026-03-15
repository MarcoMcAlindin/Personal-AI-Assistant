# SENDOFF: VOS-026 — Tasks/Planner CRUD API

## To: Mr. Green (Cloud Backend & API Engineer)
## From: Mr. Pink (Project Manager & Architectural Scout)
## Date: 2026-03-15

---

### THE PLANNER IS A GHOST. GIVE IT A BODY.

Mr. Green, the Daily Planner UI (VOS-015) is fully built — add task form, delete all confirmation dialog, list/grid toggle, archive link. Mr. Blue delivered all of it. But there are **zero `/tasks` routes** in the FastAPI gateway. The `tasks` table exists in Supabase (VOS-001) but is completely unreachable. The CEO cannot plan his day.

---

### Blocker

**VOS-025 (Auth Middleware) must be merged first.** All task endpoints require `Depends(get_current_user)` to filter by authenticated user. Do NOT start this until VOS-025 is live.

---

### Your Mission: VOS-026 (Tasks/Planner API)

**Branch:** `feature/green/26-tasks-api`

**Endpoints to implement** (add to `endpoints.py` or create a dedicated `tasks.py` router):

| Method | Path | Description | Supabase Query |
|--------|------|-------------|----------------|
| `GET` | `/tasks` | Today's non-archived tasks | `tasks` where `user_id = jwt.sub`, `is_archived = false`, `date = today` |
| `POST` | `/tasks` | Create a new task | Insert into `tasks` with `user_id`, `date = today` |
| `PATCH` | `/tasks/{task_id}` | Update a task | Update `tasks` where `id = task_id` AND `user_id = jwt.sub` |
| `DELETE` | `/tasks/{task_id}` | Delete a task | Delete from `tasks` where `id = task_id` AND `user_id = jwt.sub` |
| `GET` | `/tasks/archive` | Archived tasks | `tasks` where `user_id = jwt.sub`, `is_archived = true`, ordered by `date DESC` |

**Pydantic models:**
```python
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    duration: Optional[int] = None   # minutes
    time: Optional[str] = None       # "HH:MM"

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[int] = None
    time: Optional[str] = None
    status: Optional[str] = None
```

**Key details:**
- Every query must filter by `user_id` from the JWT — never expose another user's tasks
- `GET /tasks` defaults to `date = today` (ISO format `YYYY-MM-DD`)
- `pg_cron` already flips `is_archived = true` at midnight (VOS-002) — you do NOT need to implement archiving logic
- Blue's frontend calls `taskService.createTask()`, `taskService.getTasksForToday()`, etc. — match the response shapes

**Testing instructions for your handoff:**
```bash
# Create
curl -X POST http://localhost:8000/api/v1/tasks \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test task","description":"From curl","duration":30,"time":"14:00"}'

# Read
curl http://localhost:8000/api/v1/tasks -H "Authorization: Bearer <TOKEN>"

# Update
curl -X PATCH http://localhost:8000/api/v1/tasks/<ID> \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status":"completed"}'

# Delete
curl -X DELETE http://localhost:8000/api/v1/tasks/<ID> -H "Authorization: Bearer <TOKEN>"

# Archive
curl http://localhost:8000/api/v1/tasks/archive -H "Authorization: Bearer <TOKEN>"
```

All 5 must return correct data. Zero `placeholder_user_id` strings anywhere.

**Wire the CEO's day. - Mr. Pink**
