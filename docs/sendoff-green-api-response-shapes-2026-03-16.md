# Sendoff Letter: Mr. Green — API Response Shape Alignment

**From:** Mr. Pink (Auditor)
**Date:** 2026-03-16
**Priority:** HIGH
**Audit Reference:** `docs/mobile-audit-2026-03-16.md`
**Branch Convention:** `feature/green/<issue-id>-api-response-alignment`

---

## Context

A device-level audit of the SuperCyan mobile app revealed that several API responses from the FastAPI backend are causing silent failures on the client because the response shapes don't match what the mobile app expects. Mr. Blue has been assigned the client-side unwrapping fixes, but the following tasks require backend investigation or changes in your domain (`/backend`).

---

## Tasks (Ordered by Priority)

### TASK 1 — HIGH: Verify & Document Health Metrics Response Shape

**File:** `backend/app/api/v1/endpoints.py` (the `/health/metrics` route)
**Symptom:** The mobile Health Hub screen shows "--" for Sleep and Avg HR. The screen expects top-level fields:
```json
{
  "sleep_duration": 7.5,
  "avg_heart_rate": 72,
  "deep_sleep_duration": 1.8,
  "rem_duration": 1.53,
  "water_liters": 1.5,
  "ai_analysis": "string or null",
  "date": "2026-03-16"
}
```

**Action:**
1. Inspect the current response shape of `GET /api/v1/health/metrics`
2. If the data is nested (e.g., `{ metrics: { ... } }` or `{ data: { ... } }`), either:
   - Flatten the response to match the expected shape above, OR
   - Document the exact shape and communicate to Mr. Blue so he can unwrap correctly
3. Ensure `sleep_duration` is returned as a float in hours (e.g., `7.5` for 7h 30m)
4. Ensure `avg_heart_rate` is a plain integer

**Note:** The Health Connect sync from the Samsung Watch (`POST /health/sync`) may be writing data in a different format than what `GET /health/metrics` reads. Verify the write→read pipeline is consistent.

---

### TASK 2 — MEDIUM: Add Deep Sleep & REM to Health Response

**Current state:** The mobile app hardcodes Deep Sleep and REM values because the API doesn't provide them.

**Action:** If Samsung Watch data includes deep sleep and REM durations (check the `raw_watch_data` column in `health_metrics`), parse and return them as:
```json
{
  "deep_sleep_duration": 1.8,
  "rem_duration": 1.53
}
```

If the raw data doesn't contain these fields, inform Mr. Pink so the mobile hardcoded values can be replaced with "--" until the data pipeline supports it.

---

### TASK 3 — LOW: Include Whitelist Count in Inbox Response

**File:** `backend/app/api/v1/endpoints.py` (the `/email/inbox` route)
**Symptom:** Mobile shows "0 approved senders" because it counts whitelisted emails from the inbox array, not actual whitelist entries.

**Action:** Add an `approved_senders_count` field to the inbox response:
```json
{
  "emails": [...],
  "approved_senders_count": 3
}
```

This should query the `email_whitelist` table count and include it in the response metadata.

---

### TASK 4 — LOW: Water Intake Persistence Endpoint (Optional)

**Current state:** Water intake (+/- 250ml buttons) is local-only state on mobile. It resets every session.

**Action (if prioritized):** Add a simple endpoint:
```
PATCH /api/v1/health/water
Body: { "liters": 2.0 }
```

This would update a `water_liters` column in `health_metrics` for the current user/date. Mr. Blue will call this from the +/- button handlers.

**Coordinate with Mr. White** if a schema migration is needed to add the `water_liters` column.

---

## Coordination Notes

- **Mr. Blue** is fixing client-side unwrapping for feeds (`data.articles`, `data.concerts`). No backend change needed for feeds — the current response shape is fine, Blue will adapt.
- **Mr. Blue** needs the exact response shape of `GET /health/metrics` to wire up the Health screen correctly. Please confirm or document it ASAP.
- **Mr. White** may need a migration if `water_liters` column doesn't exist in `health_metrics`.

---

## Acceptance Criteria

- [ ] `GET /health/metrics` response shape documented and consistent with mobile expectations
- [ ] Deep Sleep and REM duration fields added to health response (or confirmed unavailable)
- [ ] Inbox response includes `approved_senders_count` metadata
- [ ] Water intake endpoint created (if prioritized)

---

**Mr. Pink** — SuperCyan Project Auditor
