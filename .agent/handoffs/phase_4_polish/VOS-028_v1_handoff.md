# HANDOFF: VOS-028 — Real react-native-health-connect Integration

- **Date:** 2026-03-15
- **Recipient:** CEO Review / Mr. Pink (Auditor)
- **Task ID:** VOS-028
- **Branch:** `feature/blue/28-health-connect-real`
- **Dependencies:** VOS-025 (JWT Auth), VOS-027 (Health API) — both merged

## Summary
Replaced the mock health simulator with a real `react-native-health-connect` native integration. The mobile Wellness Hub now reads Samsung Watch biometrics (heart rate, sleep, steps) and syncs them to the backend via `POST /api/v1/health/sync` with Supabase JWT authentication. Implements the PRD's "On-Open Sync" foreground pattern.

## Changed Files

| File | Action | Description |
|------|--------|-------------|
| `mobile/app.json` | MODIFIED | Added Health Connect Android permissions and Expo plugin |
| `mobile/src/services/healthConnectService.ts` | CREATED | Real Health Connect native integration — initializes SDK, requests permissions, reads HeartRate/SleepSession/Steps for last 24h |
| `mobile/src/services/telemetryService.ts` | REWRITTEN | Wired to `POST /api/v1/health/sync` with `Authorization: Bearer <jwt>` header. Removed simulated delay. |
| `mobile/src/services/supabase.js` | REWRITTEN | Initialized Supabase client from `@env` variables for auth session access |
| `mobile/app/(tabs)/health.tsx` | REWRITTEN | Replaced broken mock import with real service, added useEffect on-open sync, graceful fallback UI, steps display, error states |

## What Was Removed
- `getMockBiometrics()` import (never existed — was a broken reference)
- Simulated 1500ms delay in telemetryService
- All mock data paths from production flow

**Note:** `healthSimulator.ts` file is retained for development/emulator testing but is no longer imported by any production code path.

## Graceful Fallback
When Health Connect SDK is unavailable (emulator, no Samsung Watch):
> "Health Connect Unavailable. Connect your Samsung Watch to sync biometric data. Ensure the Health Connect app is installed on your device."

No zeros or mock values are displayed.

## API Contract
```
POST /api/v1/health/sync
Authorization: Bearer <supabase_jwt>
Content-Type: application/json

{
  "heart_rate": 72,
  "avg_heart_rate": 68,
  "sleep_duration": 7.5,
  "steps": 8420,
  "raw_watch_data": {
    "source": "Samsung Health Connect",
    "heart_rate_samples": [65, 70, 68, ...],
    "sleep_intervals": [{"start": "...", "end": "...", "type": "TOTAL_SLEEP"}]
  },
  "date": "2026-03-15",
  "timestamp": "2026-03-15T09:30:00.000Z"
}
```

## Testing Instructions
1. Build the Expo app: `cd mobile && npx expo run:android`
2. On a physical Android device with Samsung Watch paired:
   - Open the app → Health tab should auto-sync on mount
   - Verify heart rate, sleep, and steps display real values
3. On an emulator (no Health Connect):
   - Verify the "Health Connect Unavailable" fallback message appears
   - Verify no mock data is shown
4. Check Supabase `health_metrics` table for the upserted row

## Definition of Done Checklist
- [x] `healthConnectService.ts` created with real Health Connect API calls
- [x] `getMockBiometrics()` is no longer called in any production code path
- [x] On-Open sync fires and posts real data (or graceful fallback) to `POST /health/sync`
- [x] `Authorization: Bearer <token>` header included in API call
- [ ] Tested on a physical Android device with Samsung Health Connect enabled
- [x] Handoff confirms mock simulator removed from production flow
- [x] Code committed and pushed
