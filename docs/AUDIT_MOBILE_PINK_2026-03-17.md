# SuperCyan Mobile App Audit — 2026-03-17
**Auditor:** Mr. Pink (Scout / QA Lead)
**Device:** Samsung Galaxy S series · `RFCY504R60T` · ADB live + scrcpy
**Build:** `com.supercyan.mobile` (native APK) — `staging` branch
**Backend:** `https://supercyan-backend-enffsru5pa-ew.a.run.app`
**vLLM:** `https://supercyan-qwen-599152061719.europe-west1.run.app`
**Audit Method:** Source code analysis + live ADB screencap + live curl probes

---

## Executive Summary

The app is **not production-ready** on two fronts:

1. **AI chat is completely broken** — every prompt returns `Error: chat failed: 404`. Root cause is confirmed: the vLLM Cloud Run service responds to `/v1/models` (so the status chip reads "online") but returns 404 on `/v1/chat/completions`. This is a vLLM deployment misconfiguration, not a backend code bug.

2. **Bottom tab bar does not match ground truth** — all 5 tab icons use system OS emoji instead of the vector icon library shown in the Figma ground truth. The calendar emoji renders a red "JUL 17" tile; the heart is pink/filled — completely off-brand.

Additionally, the Health screen contains hardcoded fake metric values that will ship as real data if the auth token is absent.

---

## Bug Table

| ID | Screen | Severity | Title | File |
|----|--------|----------|-------|------|
| B-01 | AI Chat | **CRITICAL** | `POST /chat` returns 404 — AI completely non-functional | backend vLLM deployment |
| B-02 | AI Chat | **CRITICAL** | Status chip shows "AI Online" while chat fails (false positive) | `ChatScreen.jsx` + backend |
| B-03 | All screens | **MAJOR** | Bottom tab bar uses system emoji — does not match ground truth | `TabNavigator.jsx` |
| B-04 | All screens | **MAJOR** | Active tab dot indicator missing — ground truth requires cyan dot below label | `TabNavigator.jsx` |
| B-05 | Health | **MAJOR** | Deep Sleep and REM values are hardcoded (`1h 48m`, `1h 32m`) regardless of API data | `HealthScreen.jsx:116-117` |
| B-06 | Chat | MEDIUM | Header title "Qwen3.5-9B-Instruct Assistant" — wrong (too technical, wrong model per CEO directive) | `ChatScreen.jsx:74` |
| B-07 | Health | MEDIUM | Sleep delta hardcoded to `+18m` — not from real data | `HealthScreen.jsx:112` |
| B-08 | Plan | LOW | Subtitle has explicit `\n` causing "Auto-\narchives at midnight" to break across two lines | `PlannerScreen.jsx:144` |
| B-09 | Mail | INFO | Compose button has no `onPress` handler — silently does nothing | `EmailScreen.jsx:103` |

---

## B-01 — CRITICAL: Chat returns 404

### Proof (live curl)

```
POST https://supercyan-backend-enffsru5pa-ew.a.run.app/api/v1/chat
Body: { "message": "hello test" }

Response HTTP 404:
{
  "detail": "AI Service Error: Client error '404 Not Found' for url
  'https://supercyan-qwen-599152061719.europe-west1.run.app/v1/chat/completions'"
}
```

### What the backend does

`backend/app/api/v1/endpoints.py:182` — `POST /chat` calls the vLLM service at `QWEN_ENDPOINT_URL/v1/chat/completions`.

### What works vs what doesn't

| Endpoint | URL | Result |
|----------|-----|--------|
| vLLM `/v1/models` | `supercyan-qwen-599152061719.../v1/models` | ✅ 200 — returns `Qwen/Qwen3.5-9B` |
| vLLM `/v1/chat/completions` | `supercyan-qwen-599152061719.../v1/chat/completions` | ❌ 404 |

### Root cause

The vLLM Cloud Run service is **alive but not serving inference**. It responds to `/v1/models` (a lightweight health probe) but returns 404 on the actual completion endpoint. Likely causes:
- vLLM started but model is not fully loaded / wrong startup flags
- The Cloud Run service was redeployed with a changed container that doesn't expose `/v1/chat/completions`
- The `QWEN_ENDPOINT_URL` env var in Cloud Run backend points to an instance with broken routing

### Owner
**Mr. White** (infrastructure/vLLM deployment) — re-examine `vllm_deployment/` config and Cloud Run service `supercyan-qwen-599152061719`.

---

## B-02 — CRITICAL: vLLM status chip is a false positive

### Behaviour observed (live device)

- At 15:37 — chip showed green "AI Online"
- All chat attempts returned `Error: chat failed: 404`
- At 15:58 (after app restart) — chip shows red "AI Offline"

The status probe in `backend/app/api/v1/endpoints.py:379` (`GET /vllm/status`) calls `QWEN_URL/models`. Since `/models` returns 200, it reports `{"status": "online"}`. But this does NOT verify that `/v1/chat/completions` works.

**Result:** user sees "AI Online" and sends messages that all fail silently with a 404 error.

### Fix approach (for Mr. Green)

The `/vllm/status` probe should be enhanced to also verify the completions endpoint is reachable, OR a secondary probe should check completions health. Alternatively, the status chip on the frontend should degrade to "AI Error" if chat responses return 4xx.

---

## B-03 — MAJOR: Tab bar icons are system emoji (does not match ground truth)

### Ground truth vs live device comparison

| Tab | Ground Truth | Live App | Gap |
|-----|-------------|----------|-----|
| Plan | Outline calendar vector icon | 📅 system emoji (shows red "JUL 17") | Wrong — OS-rendered calendar |
| Feeds | Outline newspaper vector icon | 📰 system emoji (colourful newspaper) | Wrong — OS-rendered newspaper |
| AI | Outline chat bubble vector icon | 💬 system emoji (white speech bubbles) | Wrong — OS-rendered bubbles |
| Mail | Outline envelope vector icon | ✉️ system emoji (colourful envelope) | Wrong — OS-rendered envelope |
| Health | Outline heart vector icon | ❤️ system emoji (bright pink heart) | Wrong — OS-rendered heart |

### Current code (`TabNavigator.jsx:15-18`)

```jsx
const tabIcon = (label) => ({ focused }) => (
  <Text style={{ fontSize: 20, color: focused ? palette.accentPrimary : palette.textMuted }}>
    {label}  // ← emoji string passed as text
  </Text>
);
```

### Required fix

Replace with `@expo/vector-icons` (Ionicons) icons. The ground truth maps to:

| Tab | Icon name (Ionicons) |
|-----|----------------------|
| Plan | `calendar-outline` / `calendar` |
| Feeds | `newspaper-outline` / `newspaper` |
| AI | `chatbubble-outline` / `chatbubble` |
| Mail | `mail-outline` / `mail` |
| Health | `heart-outline` / `heart` |

Package is already likely in the Expo SDK — no new dependency needed.

### Owner
**Mr. Blue** (mobile UI)

---

## B-04 — MAJOR: Active tab dot indicator missing

### Ground truth observation

Every active tab in the ground truth UI shows a small cyan dot (colour: `#00D4FF`) **below the tab label**. This is a common design pattern for active state feedback.

### Live app

No dot indicator present. Active state is indicated only by the label turning cyan and the icon colour. This is a visible deviation from ground truth on every screen.

### Fix approach

Add a `tabBarLabel` customisation or a custom tab bar component that renders the dot. In `tabBarOptions` or `screenOptions`, the `tabBarLabel` can render a `View` containing the text + a conditional dot `View`.

### Owner
**Mr. Blue** (mobile UI)

---

## B-05 — MAJOR: Health screen Deep Sleep + REM are hardcoded

### Live device proof

Health screen shows `1h 48m` (+12%) and `1h 32m` (+5%) for Deep Sleep and REM even when Sleep and Avg HR both show `--` (no API data available). This is confirmed hardcoded.

### Code (`HealthScreen.jsx:116-117`)

```jsx
<MetricCard label="Deep Sleep" value="1h 48m" delta="+12%" />
<MetricCard label="REM" value="1h 32m" delta="+5%" />
```

No API data is read for these two cards. They always show the same values.

### Fix

Map these to real fields from the health API response. Need to confirm with Mr. Green what fields `GET /health/metrics` returns for deep sleep and REM — then wire them up the same way Sleep and Avg HR are.

### Owner
**Mr. Blue** (mobile) + **Mr. Green** (to confirm API response schema)

---

## B-06 — MEDIUM: Chat header shows wrong model name

### Current (`ChatScreen.jsx:74`)

```jsx
<Text style={{ fontSize: 18, fontWeight: 'bold' }}>Qwen3.5-9B-Instruct Assistant</Text>
```

### Ground truth

Shows "Qwen 3.5 Assistant"

### CEO Directive (per memory: 2026-03-15)

The model was downgraded from Qwen 3.5 27B → **Qwen2.5-VL-7B-Instruct**. The header should read "Qwen2.5 Assistant" (or whatever the final display name is per PRD).

### Owner
**Mr. Blue** (mobile)

---

## B-07 — MEDIUM: Sleep delta hardcoded to "+18m"

### Code (`HealthScreen.jsx:112`)

```jsx
<MetricCard label="Sleep" value={sleepDisplay} delta={data?.sleep_duration ? '+18m' : undefined} />
```

The delta `+18m` is a hardcoded string. It should be computed from the previous night's value. Either the API needs to return a `sleep_duration_delta` field, or the frontend needs to store the previous reading.

### Owner
**Mr. Blue** (mobile) + **Mr. Green** (backend schema)

---

## B-08 — LOW: Planner subtitle explicit newline breaks layout

### Code (`PlannerScreen.jsx:143-145`)

```jsx
<Text style={{ color: palette.textMuted, fontSize: 11 }}>
  {formatDate()} {'\u2022'} Auto-{'\n'}archives at midnight
</Text>
```

The `{'\n'}` is an intentional line break that splits "Auto-archives" across two lines. Ground truth shows the full string on one line. Remove the `{'\n'}`.

### Owner
**Mr. Blue** (mobile)

---

## B-09 — INFO: Compose button is a no-op

### Code (`EmailScreen.jsx:103-108`)

```jsx
<TouchableOpacity style={{ ... }}>
  <Text style={{ ... }}>Compose</Text>
</TouchableOpacity>
```

No `onPress` prop. Button is visible and tappable but does nothing. Needs compose functionality or at minimum a `onPress={() => Alert.alert('Coming soon')}` placeholder.

### Owner
**Mr. Blue** (mobile)

---

## Live Device State Snapshot

| Screen | State | Notes |
|--------|-------|-------|
| Plan | ✅ Loads | Real API data — 1 task "Habsve" visible. Progress bar renders. |
| Feeds | ⚠️ Not tested live | API feeds working per prior audit — likely displays correctly |
| AI/Chat | ❌ Broken | Every prompt returns `Error: chat failed: 404`. Status chip oscillates Online/Offline. |
| Mail | ⚠️ Not tested live | Requires auth session — likely shows empty or errors |
| Health | ⚠️ Partial | Loads but Sleep/Avg HR are `--` (no auth/data). Deep Sleep + REM show hardcoded data. |

---

## Backend Health Check (live curl, 2026-03-17 ~16:00 GMT)

| Service | URL | Status |
|---------|-----|--------|
| Gateway root | `.../` | ✅ 200 `SuperCyan Gateway Online` |
| vLLM status | `.../api/v1/vllm/status` | ✅ 200 `{"status":"online","model":"Qwen/Qwen3.5-9B","latency_ms":32}` |
| Chat endpoint | `POST .../api/v1/chat` | ❌ 404 — vLLM `/v1/chat/completions` returns 404 |

---

## Recommended Agent Tasks (Priority Order)

### Immediate (blocking demo/usage)

| Task | Agent | Title |
|------|-------|-------|
| T-1 | Mr. White | Diagnose vLLM Cloud Run service — confirm `/v1/chat/completions` route is exposed and model is fully loaded. Re-deploy if needed. |
| T-2 | Mr. Green | Update `/vllm/status` probe to validate completions endpoint health, not just `/v1/models`. |

### High priority (UI ground truth alignment)

| Task | Agent | Title |
|------|-------|-------|
| T-3 | Mr. Blue | Replace emoji tab icons with `@expo/vector-icons` Ionicons — Plan/Feeds/AI/Mail/Health |
| T-4 | Mr. Blue | Add active tab dot indicator below label (match ground truth) |
| T-5 | Mr. Blue | Wire Deep Sleep + REM metric cards to real API response fields (confirm schema with Mr. Green) |

### Medium priority

| Task | Agent | Title |
|------|-------|-------|
| T-6 | Mr. Blue | Update chat header label to "Qwen2.5 Assistant" (CEO directive, model migration) |
| T-7 | Mr. Blue | Remove explicit `\n` from Planner subtitle |
| T-8 | Mr. Blue | Remove hardcoded `+18m` sleep delta — use real delta from API or omit |
| T-9 | Mr. Blue | Add `onPress` handler to Compose button (at minimum a "Coming soon" alert) |

---

*Audit by Mr. Pink — SuperCyan Scout Protocol — 2026-03-17*
