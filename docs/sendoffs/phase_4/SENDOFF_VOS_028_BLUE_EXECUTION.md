# SENDOFF: VOS-028 — Real react-native-health-connect Integration

## Header
- **Date:** 2026-03-15
- **From:** Mr. Pink (Scout & Auditor)
- **To:** Mr. Blue (Frontend & Mobile Architect)
- **Task:** VOS-028 — Real react-native-health-connect Integration (VOS-020 Remediation)
- **Branch:** `feature/blue/28-health-connect-real`
- **Priority:** HIGH — Core PRD requirement
- **Blocker:** VOS-027 (Health Metrics API) must merge first — you cannot ship the sync call without an endpoint to hit

---

## Context

VOS-020 was marked Done but the mobile health sync is a lie. The `health.tsx` screen calls `getMockBiometrics()` from a local simulator — no real Samsung Watch data is ever read. The PRD requires actual biometric data from the user's wearable. This task replaces the mock with the real `react-native-health-connect` native integration.

You cannot start the API sync portion of this task until Mr. Green delivers VOS-027 (Health Metrics API endpoints). However, you **can** start the native Health Connect integration, permission setup, and service creation immediately. Wire the API call last once VOS-027 merges.

---

## Mission

### Step 1: Verify Library Installation
Confirm `react-native-health-connect` is in `mobile/package.json`. If missing:
```bash
cd /home/marco/vibeos-worktrees/blue/mobile
npx expo install react-native-health-connect
```

### Step 2: Android Permissions
In `mobile/app.json` (or via Expo config plugin), declare:
```json
"android": {
  "permissions": [
    "android.permission.health.READ_HEART_RATE",
    "android.permission.health.READ_SLEEP",
    "android.permission.health.READ_STEPS"
  ]
}
```

### Step 3: Create Real Health Service
Create `/mobile/src/services/healthConnectService.ts`:
- Initialize the Health Connect client
- Request permissions on first run
- Read `HeartRate`, `SleepSession`, and `Steps` records for the last 24 hours
- Return a typed `HealthPayload` matching the `POST /health-sync` API contract

### Step 4: On-Open Sync Pattern
In `mobile/app/(tabs)/health.tsx`:
- Replace `getMockBiometrics()` with `healthConnectService.getLatestBiometrics()`
- Trigger sync via `useEffect` on component mount (foreground open pattern)
- Call `POST /health-sync` with real data and the `Authorization: Bearer <token>` header (VOS-025 JWT requirement)

### Step 5: Graceful Fallback
If Health Connect is unavailable (emulator, no Samsung Watch paired), display a clear UI message:
> "Health Connect unavailable. Connect your Samsung Watch to sync data."

Do NOT silently display zeros or mock values. The mock simulator must not be called in any production code path.

---

## Key Files

| File | Action | Notes |
|------|--------|-------|
| `mobile/src/services/healthSimulator.ts` | REMOVE from production flow | Keep file if needed for dev, but `health.tsx` must not import it |
| `mobile/src/services/healthConnectService.ts` | CREATE | Real Health Connect native integration |
| `mobile/app/(tabs)/health.tsx` | MODIFY | Replace mock with real service, add auth header |
| `mobile/app.json` | MODIFY | Add Health Connect Android permissions |
| `mobile/package.json` | MODIFY (if needed) | Add `react-native-health-connect` dependency |

---

## Breaking Change Alert (VOS-025)

Mr. Green's VOS-025 (currently rejected, pending resubmission) adds JWT auth to all authenticated endpoints. Once it merges, all API calls including `POST /health-sync` will require:
```
Authorization: Bearer <supabase_jwt>
```
Get the token via `supabase.auth.getSession()` → `session.access_token`. Plan for this now — do not hardcode user IDs.

---

## Definition of Done

- [ ] `healthConnectService.ts` created with real Health Connect API calls
- [ ] `getMockBiometrics()` is no longer called in any production code path
- [ ] On-Open sync fires and posts real data (or graceful fallback) to `POST /health-sync`
- [ ] `Authorization: Bearer <token>` header included in API call
- [ ] Tested on a physical Android device with Samsung Health Connect enabled
- [ ] Handoff Letter confirms mock simulator is removed from the production flow
- [ ] Code committed and pushed
- [ ] Comment on GitHub Issue #32

---

## Worktree Setup

```bash
# If worktree doesn't exist:
cd /home/marco/Personal\ AI\ Assistant
git worktree add /home/marco/vibeos-worktrees/blue feature/blue/28-health-connect-real

# If it exists:
cd /home/marco/vibeos-worktrees/blue
git pull origin feature/blue/28-health-connect-real
```

---

## Dependencies

```
VOS-025 (Green, JWT Auth)  ──┐
                              ├──► VOS-028 (this task)
VOS-027 (Green, Health API) ──┘
```

Start the native integration now. Wire the API call after VOS-025 + VOS-027 merge.

---

*Mr. Pink — Scout & Auditor*
*"Kill the mock. Ship real data."*
