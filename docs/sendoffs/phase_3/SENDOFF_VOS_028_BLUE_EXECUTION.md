# SENDOFF: VOS-028 — Real react-native-health-connect Integration

## To: Mr. Blue (Frontend & Mobile Architect)
## From: Mr. Pink (Project Manager & Architectural Scout)
## Date: 2026-03-15

---

### THE WATCH DATA IS FAKE. MAKE IT REAL.

Mr. Blue, VOS-020 was marked Done but the mobile health sync calls `getSimulatedHealthData()` from `healthSimulator.ts` — generating hardcoded values, not reading the Samsung Watch. The PRD (§3.5) requires real biometric data via `react-native-health-connect`. This remediation replaces the mock with the real native integration.

---

### Blocker

**VOS-027 (Health Metrics API) must be merged first.** You need a real `POST /api/v1/health/sync` endpoint to push data to. Without it, there's nowhere to send the watch readings.

---

### Your Mission: VOS-028 (Real Health Connect)

**Branch:** `feature/blue/28-real-health-connect`

### Step 1 — Verify Library Installation

Check `mobile/package.json` for `react-native-health-connect`. If missing:
```bash
cd mobile && npx expo install react-native-health-connect
```

### Step 2 — Android Permissions

In `mobile/app.json`, add the Health Connect permissions:
```json
{
  "expo": {
    "android": {
      "permissions": [
        "android.permission.health.READ_HEART_RATE",
        "android.permission.health.READ_SLEEP",
        "android.permission.health.READ_STEPS"
      ]
    }
  }
}
```

### Step 3 — Create Real Health Service

Rewrite `mobile/src/services/healthConnect.js` (currently empty) as `healthConnectService.ts`:

```typescript
// Required functions:
// 1. initHealthConnect() — initialize the client, request permissions
// 2. readHeartRate()     — HeartRate records for last 24 hours
// 3. readSleepSessions() — SleepSession records for last 24 hours
// 4. readSteps()         — Steps records for last 24 hours
// 5. syncToBackend(data) — POST to /api/v1/health/sync with the payload
```

The payload sent to the backend must match this shape (agreed with Mr. Green in VOS-027):
```json
{
  "heart_rate": 72,
  "sleep_duration": 7.5,
  "avg_heart_rate": 68,
  "raw_watch_data": {
    "source": "Samsung Galaxy Watch",
    "heart_rate_samples": [65, 70, 68, 72, 65],
    "sleep_intervals": [
      { "start": "2026-03-14T23:00:00Z", "end": "2026-03-15T06:30:00Z", "type": "TOTAL_SLEEP" }
    ]
  },
  "timestamp": "2026-03-15T08:00:00Z"
}
```

### Step 4 — Wire the On-Open Sync Pattern

In `mobile/app/(tabs)/health.tsx`:
- Replace the call to `getSimulatedHealthData()` / `syncBiometrics()` with `initHealthConnect()` + `readHeartRate()` + `readSleepSessions()` + `syncToBackend()`
- Fire this sync in a `useEffect` when the screen mounts (the "On-Open" pattern from PRD §3.5)
- Show a "Syncing with Samsung Watch..." loading state while the native bridge responds

### Step 5 — Graceful Fallback

If Health Connect is unavailable (emulator, no Samsung Watch paired):
- Catch the error and display "Health Connect unavailable — connect your Samsung Watch"
- Do NOT fall back to `healthSimulator.ts` silently — the whole point of this task is to kill the mock

### What to Keep, What to Delete

| File | Action |
|------|--------|
| `mobile/src/services/healthConnect.js` | REWRITE as `healthConnectService.ts` |
| `mobile/src/services/healthSimulator.ts` | **DELETE** — the mock is dead |
| `mobile/src/services/telemetryService.ts` | Keep — review if it calls the simulator |
| `mobile/app/(tabs)/health.tsx` | MODIFY — swap mock calls for real Health Connect |

### Testing Instructions for Your Handoff

1. Open the Expo app on a physical Android device with Samsung Health installed
2. Navigate to the Health tab
3. Accept the Health Connect permissions prompt
4. Verify "Syncing with Samsung Watch..." appears briefly
5. Verify real biometric data populates the UI (heart rate, sleep, steps)
6. Check Supabase `health_metrics` table for a new row matching the sync

If testing on an emulator without Health Connect:
- Verify the error message appears: "Health Connect unavailable"
- Verify NO mock data appears — the simulator is deleted

**Connect the CEO to his body. - Mr. Pink**
