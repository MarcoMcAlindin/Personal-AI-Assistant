# VibeOS Mobile App Audit — 2026-03-16

**Auditor:** Mr. Pink (Scout)
**Device:** Samsung Galaxy (RFCY504R60T) via ADB + scrcpy
**Build:** Expo Go tunnel from `staging` branch
**Backend:** `https://vibeos-backend-enffsru5pa-ew.a.run.app` (confirmed online, HTTP 200)

---

## Summary of Findings

| # | Screen | Severity | Issue |
|---|--------|----------|-------|
| 1 | Feeds | **CRITICAL** | Both Tech Feed and Concerts show "No feeds available" despite backend returning full data (10 articles, 14 concerts) |
| 2 | AI Chat | EXPECTED | "Error: chat failed: 500" — vLLM model is being redeployed |
| 3 | AI Chat | MEDIUM | Raw error string exposed to user (`Error: chat failed: 500`) instead of friendly message |
| 4 | Health | MEDIUM | Sleep and Avg HR show "--" — likely `fetchHealth` response shape mismatch |
| 5 | Health | LOW | Deep Sleep ("1h 48m") and REM ("1h 32m") values are **hardcoded**, not from API |
| 6 | Health | LOW | Water intake (+/- buttons) is local state only, never persisted to backend |
| 7 | Mail | INFO | "0 approved senders" — whitelist count derived from email array, not a dedicated count |
| 8 | Architecture | MEDIUM | Dead code: entire `app/(tabs)/` Expo Router directory is unused — app uses `src/navigation/TabNavigator.jsx` via React Navigation |

---

## BUG 1 (CRITICAL): Feeds Show Empty Despite Backend Returning Data

### Root Cause

**API response shape mismatch.** The backend wraps data in named keys, but the mobile client expects bare arrays.

**Backend returns:**
```json
GET /api/v1/feeds/tech  →  { "articles": [ ... ] }
GET /api/v1/feeds/concerts  →  { "concerts": [ ... ] }
```

**`src/services/api.js` lines 20-29:**
```js
export async function fetchTechFeeds() {
  const res = await fetch(`${API_BASE_URL}/feeds/tech`);
  return res.json();  // Returns { articles: [...] } — an OBJECT, not an array
}
export async function fetchConcerts() {
  const res = await fetch(`${API_BASE_URL}/feeds/concerts`);
  return res.json();  // Returns { concerts: [...] } — an OBJECT, not an array
}
```

**`src/screens/FeedsScreen.jsx` lines 23-25:**
```js
setTechArticles(Array.isArray(techData) ? techData : []);  // Object fails Array.isArray → []
setConcerts(Array.isArray(concertData) ? concertData : []);  // Same → []
```

### Fix (choose one)

**Option A — Fix in `api.js` (recommended, single source of truth):**
```js
// src/services/api.js
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

**Option B — Fix in `FeedsScreen.jsx`:**
```js
setTechArticles(Array.isArray(techData) ? techData : techData?.articles || []);
setConcerts(Array.isArray(concertData) ? concertData : concertData?.concerts || []);
```

---

## BUG 2 (EXPECTED): AI Chat 500 Error

vLLM endpoint is being redeployed. No action needed.

---

## BUG 3 (MEDIUM): Raw Error Exposed in Chat

### Location
`src/screens/ChatScreen.jsx` line 89:
```js
content: `Error: ${err.message}`  // Shows "Error: chat failed: 500"
```

### Fix
```js
content: 'AI is temporarily unavailable. Please try again shortly.'
```

---

## BUG 4 (MEDIUM): Health — Sleep & Avg HR Show "--"

### Root Cause
`src/screens/HealthScreen.jsx` calls `fetchHealth()` which hits `GET /api/v1/health/metrics`. The response likely wraps data (e.g., `{ metrics: { ... } }`) but the screen reads `data?.sleep_duration` and `data?.avg_heart_rate` directly from the top-level response object.

### Fix Instructions
1. Test the endpoint: `curl https://vibeos-backend-enffsru5pa-ew.a.run.app/api/v1/health/metrics` with auth headers
2. Compare response shape to what `HealthScreen.jsx` expects
3. Either unwrap in `api.js` `fetchHealth()` or fix field access in the screen

---

## BUG 5 (LOW): Hardcoded Deep Sleep & REM Values

### Location
`src/screens/HealthScreen.jsx` lines 116-117:
```jsx
<MetricCard label="Deep Sleep" value="1h 48m" delta="+12%" />
<MetricCard label="REM" value="1h 32m" delta="+5%" />
```

These are **static strings**, not derived from `data`. They will show the same values regardless of actual health data.

### Fix
Replace with API data fields (e.g., `data?.deep_sleep_duration`, `data?.rem_duration`), or remove the cards until the backend provides these metrics.

---

## BUG 6 (LOW): Water Intake Not Persisted

### Location
`src/screens/HealthScreen.jsx` — `waterIntake` is a `useState(1.5)` that resets every session. The +/- buttons modify local state only.

### Fix
Add an API call to save water intake, or store locally with `AsyncStorage`.

---

## BUG 7 (INFO): Email Whitelist Count

### Location
`src/screens/EmailScreen.jsx` line 43:
```js
const whitelistCount = emails.filter(e => e.status === 'whitelisted').length;
```

This counts whitelisted emails from the fetched inbox, not the number of approved senders. When inbox is empty, it shows "0 approved senders" even if senders are configured.

### Fix
Fetch whitelist count from a dedicated endpoint or include it in the inbox response metadata.

---

## BUG 8 (MEDIUM): Dead Expo Router Code

### Location
Entire `app/(tabs)/` directory with 7 files:
- `_layout.tsx`, `index.tsx`, `plan.tsx`, `feeds.tsx`, `ai.tsx`, `mail.tsx`, `health.tsx`

### Problem
`mobile/index.js` registers `src/App.jsx` as the root, which uses React Navigation (`@react-navigation/bottom-tabs`). The Expo Router files in `app/(tabs)/` are **never loaded**.

This causes confusion — the `app/(tabs)/feeds.tsx` has its own implementation with different UI ("Vibe Feeds" title, "Tech & AI" tab label) that will never render. Any developer editing those files will see no effect.

### Fix
Either:
- **Delete `app/(tabs)/`** and commit to React Navigation
- **Migrate to Expo Router** by changing `index.js` to `import 'expo-router/entry'` and porting `src/screens/` into `app/(tabs)/`

---

## Also Observed (Not Bugs)

| Item | Status | Notes |
|------|--------|-------|
| Planner tab | Working | Tasks load, progress bar functional, add/complete works |
| Tab navigation | Working | All 5 tabs accessible, correct highlighting |
| OLED theme | Working | Deep black backgrounds, cyan accents, consistent palette |
| Pull-to-refresh | Working | All screens (Feeds, Planner, Mail, Health) support RefreshControl |
| Expo tunnel | Working | Metro bundler serving via ngrok tunnel |
| Supabase auth | Working | Auto sign-in with `ceo@vibeos.app` test account |
| Backend connectivity | Working | All endpoints returning HTTP 200 (except vLLM-dependent chat) |

---

## Recommended Fix Priority

1. **BUG 1** — Feeds response unwrapping (critical, 2-line fix)
2. **BUG 8** — Delete dead `app/(tabs)/` code (cleanup, prevents confusion)
3. **BUG 3** — Friendly chat error message (quick UX win)
4. **BUG 4** — Health metrics response shape (needs endpoint testing)
5. **BUG 5** — Replace hardcoded Deep Sleep/REM (needs backend support)
6. **BUG 6** — Persist water intake (feature work)
7. **BUG 7** — Whitelist count from metadata (feature work)
