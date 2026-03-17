# Sendoff Letter: Mr. Blue — Mobile Bug Fixes

**From:** Mr. Pink (Auditor)
**Date:** 2026-03-16
**Priority:** CRITICAL
**Audit Reference:** `docs/mobile-audit-2026-03-16.md`
**Branch Convention:** `feature/blue/<issue-id>-mobile-audit-fixes`

---

## Context

A full device-level audit of the VibeOS mobile app was performed on 2026-03-16 via ADB + scrcpy on a physical Samsung Galaxy. The backend is confirmed online and returning valid data for all endpoints. The bugs below are all **client-side** in your domain (`/mobile`).

**Important architectural note:** The running app does NOT use Expo Router. The entry point is `mobile/index.js` → `src/App.jsx` → `src/navigation/TabNavigator.jsx` → `src/screens/*.jsx`. The `app/(tabs)/` directory is dead code.

---

## Tasks (Ordered by Priority)

### TASK 1 — CRITICAL: Fix Feeds Response Unwrapping

**Files:** `mobile/src/services/api.js` (lines 20-29)
**Symptom:** Both "Tech Feed" and "Concerts" tabs show "No feeds available" despite backend returning full data.

**Root Cause:** `fetchTechFeeds()` and `fetchConcerts()` return the raw JSON object from the API. The backend wraps results:
- `GET /api/v1/feeds/tech` returns `{ "articles": [...] }`
- `GET /api/v1/feeds/concerts` returns `{ "concerts": [...] }`

But `FeedsScreen.jsx` line 24 does `Array.isArray(techData) ? techData : []` — the object fails the check, so the array is always empty.

**Exact Fix in `api.js`:**
```js
export async function fetchTechFeeds() {
  const res = await fetch(`${API_BASE_URL}/feeds/tech`);
  if (!res.ok) throw new Error(`feeds/tech failed: ${res.status}`);
  const data = await res.json();
  return data.articles || [];
}

export async function fetchConcerts() {
  const res = await fetch(`${API_BASE_URL}/feeds/concerts`);
  if (!res.ok) throw new Error(`feeds/concerts failed: ${res.status}`);
  const data = await res.json();
  return data.concerts || [];
}
```

**Verification:** After fix, pull-to-refresh on the Feeds tab should populate 10+ tech articles and 14+ concert listings.

---

### TASK 2 — MEDIUM: Friendly Chat Error Message

**File:** `mobile/src/screens/ChatScreen.jsx` (line 89)
**Symptom:** When AI is unavailable, user sees raw `"Error: chat failed: 500"`.

**Fix:** Replace line 89:
```js
// BEFORE
content: `Error: ${err.message}`,

// AFTER
content: 'AI is temporarily unavailable. Please try again shortly.',
```

---

### TASK 3 — MEDIUM: Delete Dead Expo Router Code

**Directory:** `mobile/app/(tabs)/`
**Files:** `_layout.tsx`, `index.tsx`, `plan.tsx`, `feeds.tsx`, `ai.tsx`, `mail.tsx`, `health.tsx`

These 7 files are never loaded. The app's entry point (`index.js`) registers `src/App.jsx` which uses React Navigation, completely bypassing Expo Router. Any edits to `app/(tabs)/` have zero effect and will mislead future developers.

**Action:** Delete the entire `mobile/app/(tabs)/` directory. If Expo Router's `app/` directory is required for the Expo build to succeed, keep only a minimal `app/index.tsx` that redirects to the React Navigation root, or migrate fully to Expo Router in a separate ticket.

---

### TASK 4 — MEDIUM: Health Metrics Response Shape

**File:** `mobile/src/screens/HealthScreen.jsx` (lines 71-73, 112-113)
**Symptom:** "Sleep" and "Avg HR" cards show "--" while Deep Sleep and REM show data (because those are hardcoded).

**Investigation needed:** Run this from the device or with auth headers:
```
curl -H "Authorization: Bearer <token>" \
  https://vibeos-backend-enffsru5pa-ew.a.run.app/api/v1/health/metrics
```

Compare the response shape to what the screen expects:
- `data.sleep_duration` (expects a number in hours, e.g., `7.5`)
- `data.avg_heart_rate` (expects a number, e.g., `72`)

If the API wraps these in a sub-object (e.g., `{ metrics: { ... } }`), unwrap in `api.js`'s `fetchHealth()` the same way as the feeds fix.

**Coordinate with Mr. Green** if the endpoint needs to return additional fields or change its response shape.

---

### TASK 5 — LOW: Replace Hardcoded Health Values

**File:** `mobile/src/screens/HealthScreen.jsx` (lines 116-117)
**Symptom:** Deep Sleep and REM cards show static `"1h 48m"` and `"1h 32m"` regardless of actual data.

**Fix:** Either:
- Wire these to actual API response fields (coordinate with Green if fields don't exist yet)
- Or display "--" like Sleep/Avg HR when no data is available, to avoid misleading the user

---

### TASK 6 — LOW: Persist Water Intake

**File:** `mobile/src/screens/HealthScreen.jsx` (lines 43, 141-153)
**Symptom:** Water intake resets to 1.5L every time the screen remounts.

**Fix options (pick one):**
- Store in `AsyncStorage` for local persistence across sessions
- POST to a backend endpoint for cloud persistence (coordinate with Green)

---

## Acceptance Criteria

- [ ] Feeds tab shows tech articles from backend on first load
- [ ] Feeds tab shows concert listings from backend on first load
- [ ] Chat error shows user-friendly message, not raw HTTP status
- [ ] `app/(tabs)/` directory removed or explicitly deprecated
- [ ] Health Sleep/Avg HR display real data when available
- [ ] No hardcoded metric values misleading the user

---

**Mr. Pink** — VibeOS Project Auditor
