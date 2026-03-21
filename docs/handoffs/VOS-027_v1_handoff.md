# HANDOFF: VOS-027 -- Health Metrics API Endpoints

## 1. Header Information
- **Date:** 2026-03-15
- **From:** Mr. Green (Cloud Backend & API Engineer)
- **Recipient:** Mr. Pink (Audit) / CEO Review
- **Task ID:** VOS-027
- **Branch:** `feature/green/27-health-api`

---

## 2. Summary

Implemented 4 health metric endpoints that connect the Health Dashboard (VOS-018) and mobile health sync (VOS-020) to the `health_metrics` Supabase table. The old `POST /health-sync` placeholder (returned a static message) has been replaced with a full CRUD surface: biometric sync (upsert), metrics read, AI analysis read, and water logging. All endpoints are JWT-protected via `Depends(get_current_user)` from VOS-025.

---

## 3. Changed Files

| Action | File | Description |
|--------|------|-------------|
| REWRITE | `backend/app/services/health_service.py` | Full HealthService class with 4 methods (sync, metrics, analysis, water) |
| MODIFY | `backend/app/api/v1/endpoints.py` | Replaced placeholder, added 4 health routes + 2 Pydantic models |
| CREATE | `backend/tests/test_health.py` | 9 pytest cases covering auth + validation for all 4 endpoints |

---

## 4. Strict Testing Instructions

### Automated Tests
```bash
cd /home/marco/supercyan-worktrees/green/backend
source .venv/bin/activate
pytest tests/ -v
```

**Expected:** 13/13 pass (4 auth + 9 health).

### Grep Verification
```bash
grep -r "Placeholder.*Biometric\|health-sync" backend/
```
**Expected:** Empty (old placeholder removed, route renamed to `/health/sync`).

### Manual curl Tests
```bash
# Generate a test token (replace YOUR_SECRET with SUPABASE_JWT_SECRET)
TOKEN=$(python3 -c "
from jose import jwt; import time
print(jwt.encode(
    {'sub': 'test-uuid', 'aud': 'authenticated', 'exp': int(time.time()) + 3600},
    'YOUR_SECRET', algorithm='HS256'
))")

# 1. Sync biometrics (upsert)
curl -X POST http://localhost:8000/api/v1/health/sync \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"heart_rate":72,"sleep_duration":7.5,"avg_heart_rate":68,"raw_watch_data":{"source":"Samsung Galaxy Watch 6"},"timestamp":"2026-03-15T08:00:00Z"}'
# Expected: {"synced":true,"date":"2026-03-15","rows":1}

# 2. Read metrics (last 10 days)
curl http://localhost:8000/api/v1/health/metrics \
  -H "Authorization: Bearer $TOKEN"
# Expected: {"metrics":[...]}

# 3. Read AI analysis
curl http://localhost:8000/api/v1/health/analysis \
  -H "Authorization: Bearer $TOKEN"
# Expected: {"analysis":null} (no VOS-010 analysis yet) or {"analysis":"..."}

# 4. Log water (250ml)
curl -X POST http://localhost:8000/api/v1/health/water \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount_liters":0.25}'
# Expected: {"water_liters":0.25,"date":"2026-03-15"}

# 5. Auth check -- no token returns 403
curl http://localhost:8000/api/v1/health/metrics
# Expected: {"detail":"Not authenticated"}

# 6. Validation -- missing required field returns 422
curl -X POST http://localhost:8000/api/v1/health/water \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
# Expected: 422 Unprocessable Entity
```

---

## 5. Environment Variable Changes

None. All required variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`) were established in VOS-025.

---

## 6. API / Database Schema Changes

### New/Changed API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/health/sync` | JWT | Upsert biometrics keyed on `(user_id, date)` -- replaces old `/health-sync` placeholder |
| `GET` | `/health/metrics` | JWT | Return last 10 days of health data |
| `GET` | `/health/analysis` | JWT | Return today's AI analysis text (null if none) |
| `POST` | `/health/water` | JWT | Increment today's `water_liters` by given amount |

### Breaking Change
- Old route `POST /health-sync` is removed. Frontends must update to `POST /health/sync`.
- The new sync endpoint accepts a richer payload (see `HealthSyncPayload` model).

### Request/Response Models

**HealthSyncPayload (POST /health/sync):**
```json
{
  "heart_rate": 72,
  "sleep_duration": 7.5,
  "avg_heart_rate": 68,
  "water_liters": 2.5,
  "raw_watch_data": {},
  "timestamp": "2026-03-15T08:00:00Z",
  "date": "2026-03-15"
}
```
All fields optional except one of `timestamp` or `date`. Accepts both the mobile simulator shape (`date` field) and the sendoff curl shape (`timestamp` field).

**WaterLogRequest (POST /health/water):**
```json
{"amount_liters": 0.25}
```

### Database Schema Changes
None. Uses existing `health_metrics` table with `UNIQUE(user_id, date)` constraint for upsert.

---

## 7. Notes for Next Agent

### Mr. Blue (Frontend)
- Update Health Dashboard (VOS-018) to call `/health/metrics` and `/health/analysis` instead of using demo data
- Update the "Add 250ml" button to `POST /health/water` with `{"amount_liters": 0.25}`
- The old `/health-sync` route no longer exists -- mobile sync must point to `/health/sync`
- All requests require `Authorization: Bearer <supabase_jwt>` header

### Mr. Red (AI/Automation)
- `GET /health/analysis` returns the `ai_analysis` column that VOS-010's 8AM GitHub Action writes to
- If the action hasn't run for today, the endpoint returns `{"analysis": null}` -- this is correct behavior, not an error

---

## 8. Evolution & Self-Healing (Rule 20)

No new rules created or amended. Justification:
- Implementation followed Mr. Pink's sendoff spec without deviations or retries
- All 9 tests passed on first run
- Lesson learned from VOS-025 rejection applied: committed, pushed, and commented on the issue as part of this task's completion (no process violation)

---

*Submitted by Mr. Green -- 2026-03-15*
