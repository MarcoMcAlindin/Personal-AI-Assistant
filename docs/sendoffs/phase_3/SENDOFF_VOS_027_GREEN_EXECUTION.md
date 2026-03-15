# SENDOFF: VOS-027 — Health Metrics API Endpoints

## To: Mr. Green (Cloud Backend & API Engineer)
## From: Mr. Pink (Project Manager & Architectural Scout)
## Date: 2026-03-15

---

### THE HEALTH HUB IS BLIND. GIVE IT EYES.

Mr. Green, the Health Dashboard (VOS-018) shows demo data and the mobile sync (VOS-020) pushes to a placeholder endpoint that does nothing. The `health_metrics` table exists in Supabase with real columns (`water_liters`, `sleep_duration`, `avg_heart_rate`, `raw_watch_data`, `ai_analysis`) but nothing reads from it or writes to it through the API. The 8AM AI analysis (VOS-010) already writes `ai_analysis` to the table — but no endpoint serves it to the frontend.

---

### Blocker

**VOS-025 (Auth Middleware) must be merged first.** All health endpoints require `Depends(get_current_user)`.

---

### Your Mission: VOS-027 (Health Metrics API)

**Branch:** `feature/green/27-health-api`

**Endpoints to implement:**

| Method | Path | Description | Supabase Query |
|--------|------|-------------|----------------|
| `POST` | `/health/sync` | Receive biometric payload from mobile, upsert into `health_metrics` | Upsert keyed on `(user_id, date)` |
| `GET` | `/health/metrics` | Return latest N days of health data | Select from `health_metrics` where `user_id = jwt.sub`, order by `date DESC`, limit 10 |
| `GET` | `/health/analysis` | Return today's AI analysis text | Select `ai_analysis` from `health_metrics` where `user_id = jwt.sub` and `date = today` |
| `POST` | `/health/water` | Increment today's water count | Update `health_metrics` set `water_liters = water_liters + amount` where `user_id` and `date = today` |

**Replace the existing placeholder** at `POST /health-sync` (line 83-85 of `endpoints.py`) — it currently returns a static message and does nothing.

**Pydantic models:**
```python
class HealthSyncPayload(BaseModel):
    heart_rate: Optional[float] = None
    sleep_duration: Optional[float] = None   # hours
    avg_heart_rate: Optional[float] = None
    raw_watch_data: Optional[dict] = None
    timestamp: str   # ISO format

class WaterLogRequest(BaseModel):
    amount_liters: float  # e.g. 0.25 for 250ml
```

**Key details:**
- `POST /health/sync` must UPSERT — if a row already exists for `(user_id, date)`, update it rather than creating a duplicate. The mobile app fires sync on every open (PRD §3.5).
- `GET /health/analysis` returns the `ai_analysis` column populated by Mr. Red's 8AM GitHub Action (VOS-010). If no analysis exists for today, return `null` — do NOT fabricate one.
- `POST /health/water` must handle the "Add 250ml" button in the Health Dashboard. The frontend sends `{"amount_liters": 0.25}`. If no row exists for today, create one with just `water_liters`.
- The mobile simulator (`mobile/src/services/healthSimulator.ts`) sends this shape:
  ```json
  {
    "date": "2026-03-15",
    "water_liters": 2.5,
    "sleep_duration": 7.5,
    "avg_heart_rate": 68,
    "raw_watch_data": { "source": "Samsung Galaxy Watch 6", ... }
  }
  ```
  Your `POST /health/sync` must accept this shape.

**Testing instructions for your handoff:**
```bash
# Sync biometrics
curl -X POST http://localhost:8000/api/v1/health/sync \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"heart_rate":72,"sleep_duration":7.5,"avg_heart_rate":68,"raw_watch_data":{},"timestamp":"2026-03-15T08:00:00Z"}'

# Read metrics
curl http://localhost:8000/api/v1/health/metrics -H "Authorization: Bearer <TOKEN>"

# Read AI analysis
curl http://localhost:8000/api/v1/health/analysis -H "Authorization: Bearer <TOKEN>"

# Log water
curl -X POST http://localhost:8000/api/v1/health/water \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"amount_liters":0.25}'
```

**Give the CEO his morning briefing. - Mr. Pink**
