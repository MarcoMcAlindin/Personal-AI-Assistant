# Sendoff Letter: Mr. Blue — Mobile UI Ground Truth Alignment

**From:** Mr. Pink (Project Manager & Scout)
**To:** Mr. Blue (Frontend & Mobile Architect)
**Date:** 2026-03-17
**Priority:** HIGH — app does not match ground truth on every screen
**Issues:** VOS-055, VOS-056, VOS-057
**Skills:**
- `.agent/skills/expo-ionicons-tab-navigator/SKILL.md` (VOS-055)
- `.agent/skills/health-watch-data-field-mapper/SKILL.md` (VOS-056)
- `.agent/skills/oled-theme-enforcer/SKILL.md` (all screens)

---

## Overview

Mr. Pink audited the live app on device (Samsung Galaxy `RFCY504R60T`) and compared against the Figma ground truth images in `docs/assets/ui_ground_truth/`. Three classes of deviation were found — all in your domain. These are grouped into one branch for efficiency.

**Branch:** `feature/blue/055-056-057-mobile-ui-alignment`

---

## TASK 1 — VOS-055: Replace Emoji Tab Icons With Ionicons + Add Active Dot

**Issue:** https://github.com/MarcoMcAlindin/Personal-AI-Assistant/issues/70
**File:** `mobile/src/navigation/TabNavigator.jsx`

### The Problem

All 5 tab icons use system OS emoji rendered via `<Text>`. On Android, the calendar emoji displays a colourful "JUL 17" calendar tile — nothing like the ground truth. System emoji ignore `color` props and break the OLED aesthetic.

### Ground Truth Reference

Open these files and compare carefully:
- `docs/assets/ui_ground_truth/mobile_planner_v1.png` — Plan tab active (calendar outline, cyan)
- `docs/assets/ui_ground_truth/mobile_health_v1.png` — Health tab active (heart icon, label cyan, dot underneath)
- `docs/assets/ui_ground_truth/mobile_chat_v1.png` — AI tab active (chat bubble, dot underneath)

### Exact Implementation

Read `.agent/skills/expo-ionicons-tab-navigator/SKILL.md` in full before writing a line of code. It contains the complete implementation including the active dot indicator. Summary:

**Icon map:**
| Tab | Inactive | Active |
|-----|----------|--------|
| Plan | `calendar-outline` | `calendar` |
| Feeds | `newspaper-outline` | `newspaper` |
| AI | `chatbubble-outline` | `chatbubble` |
| Mail | `mail-outline` | `mail` |
| Health | `heart-outline` | `heart` |

**Import:** `import { Ionicons } from '@expo/vector-icons';`
No new dependency — Ionicons is bundled in the Expo SDK.

**Active dot:** Small `View` rendered below the label text when `focused === true`. Colour: `palette.accentPrimary` (`#00D4FF`). Size: 4x4dp, borderRadius 2.

### Acceptance Test

1. Open app on device
2. Navigate to each tab
3. Active tab icon must be filled, cyan, no emoji
4. A small cyan dot appears below the active tab's label
5. Compare side-by-side with `mobile_planner_v1.png` and `mobile_health_v1.png`

---

## TASK 2 — VOS-056: Wire Health Screen to Real API Data (Remove Hardcoded Values)

**Issue:** https://github.com/MarcoMcAlindin/Personal-AI-Assistant/issues/71
**File:** `mobile/src/screens/HealthScreen.jsx`

### The Problem

Two metric cards are hardcoded and will always show fake data:

```jsx
// Line 116: HARDCODED — remove this
<MetricCard label="Deep Sleep" value="1h 48m" delta="+12%" />
// Line 117: HARDCODED — remove this
<MetricCard label="REM" value="1h 32m" delta="+5%" />
```

Additionally, the sleep delta is hardcoded:
```jsx
// Line 112: HARDCODED delta — remove "+18m" string
delta={data?.sleep_duration ? '+18m' : undefined}
```

Live device proof: Sleep and Avg HR show `--` (no data available), but Deep Sleep and REM still show `1h 48m` and `1h 32m`. This means hardcoded fixture values are shipping as if they were real health data.

### The Fix

Read `.agent/skills/health-watch-data-field-mapper/SKILL.md` in full. Key points:

**1. Fix the data loading** — the API returns `{ metrics: [{ date, sleep_duration, avg_heart_rate, raw_watch_data, ... }] }`. The screen currently calls `fetchHealth()` but reads `result` directly. The correct shape is `result.metrics[0]`:

```javascript
const result = await fetchHealth();
const latest = result?.metrics?.[0] ?? null;
setData(latest);
```

**2. Extract Deep Sleep and REM from `raw_watch_data`:**

```javascript
const deepSleepRaw = data?.raw_watch_data?.deep_sleep_hours ?? null;
const deepSleepDisplay = deepSleepRaw != null
  ? `${Math.floor(deepSleepRaw)}h ${Math.round((deepSleepRaw % 1) * 60)}m`
  : '--';

const remRaw = data?.raw_watch_data?.rem_sleep_hours ?? null;
const remDisplay = remRaw != null
  ? `${Math.floor(remRaw)}h ${Math.round((remRaw % 1) * 60)}m`
  : '--';
```

**3. Remove ALL hardcoded deltas.** Pass `delta={null}` (or remove the prop) for all cards until the backend provides real delta values. Do NOT pass `'+18m'`, `'+12%'`, `'+5%'` — these are fixture values from the initial mockup.

**4. Update MetricCard wiring:**

```jsx
<MetricCard label="Sleep" value={sleepDisplay} />
<MetricCard label="Avg HR" value={data?.avg_heart_rate ? `${data.avg_heart_rate} bpm` : '--'} />
<MetricCard label="Deep Sleep" value={deepSleepDisplay} />
<MetricCard label="REM" value={remDisplay} />
```

**5. Also update MetricCard component** — the `delta` prop should only render if it's a non-null, non-undefined value. Verify the guard is there.

### What to Do if Raw Watch Data Has Different Field Names

The `raw_watch_data` JSONB might use different keys depending on when it was synced. Check the health simulator:

```bash
cat mobile/src/services/healthSimulator.ts
```

And compare against `backend/app/services/health_service.py` to confirm field names. If the field names differ from `deep_sleep_hours` / `rem_sleep_hours`, use whatever the actual keys are. Guard with optional chaining — `raw_watch_data?.deep_sleep_hours ?? null`.

### Acceptance Test

1. With real user session: Navigate to Health tab, verify all 4 metric cards load real data
2. Without data (no auth): All 4 metric cards must show `--`, not hardcoded values
3. AI Analysis card renders if `ai_analysis` is present, hidden if not

---

## TASK 3 — VOS-057: Chat Header Model Name + Minor Text Fixes

**Issue:** https://github.com/MarcoMcAlindin/Personal-AI-Assistant/issues/72

Three small fixes across three files. Do them all in one commit.

### Fix 1 — Chat header model name

**File:** `mobile/src/screens/ChatScreen.jsx:74`

```jsx
// Before:
<Text style={{ fontSize: 18, fontWeight: 'bold' }}>Qwen3.5-9B-Instruct Assistant</Text>

// After (per CEO directive — model changed to Qwen2.5-VL-7B):
<Text style={{ fontSize: 18, fontWeight: 'bold' }}>Qwen2.5 Assistant</Text>
```

The ground truth shows "Qwen 3.5 Assistant" but per the CEO model migration directive (2026-03-15) the model is now Qwen2.5-VL-7B-Instruct. Use "Qwen2.5 Assistant" as the display name.

### Fix 2 — Planner subtitle explicit newline

**File:** `mobile/src/screens/PlannerScreen.jsx:144`

```jsx
// Before (breaks "Auto-" onto its own line):
{formatDate()} {'\u2022'} Auto-{'\n'}archives at midnight

// After (one line, matches ground truth):
{formatDate()} {'\u2022'} Auto-archives at midnight
```

### Fix 3 — Compose button placeholder

**File:** `mobile/src/screens/EmailScreen.jsx:103`

```jsx
// Before (silent no-op):
<TouchableOpacity style={{ ... }}>

// After (placeholder feedback):
<TouchableOpacity
  style={{ ... }}
  onPress={() => Alert.alert('Coming Soon', 'Compose email feature is under development.')}
>
```

Add `import { Alert } from 'react-native';` to the imports if not already present.

---

## Branch Strategy

Use one branch for all three tasks:
```
feature/blue/055-056-057-mobile-ui-alignment
```

Three commits, one PR:
```bash
git commit -m "[VOS-055][Blue] feat: replace emoji tab icons with Ionicons + active dot indicator"
git commit -m "[VOS-056][Blue] fix: wire Health screen Deep Sleep/REM to API data, remove hardcoded values"
git commit -m "[VOS-057][Blue] fix: chat model label, planner subtitle newline, compose placeholder"
```

---

## Full Acceptance Criteria

### VOS-055 (Tab Icons)
- [ ] All 5 tab icons are Ionicons outline/filled vectors — zero emoji
- [ ] Active icon is filled variant, `#00D4FF` colour
- [ ] Inactive icon is outline variant, `#71717A` colour
- [ ] Cyan dot (4x4dp) appears below active tab label
- [ ] Verified on device against `mobile_planner_v1.png` and `mobile_health_v1.png`

### VOS-056 (Health Data)
- [ ] Deep Sleep and REM cards show `--` when no API data
- [ ] Deep Sleep and REM cards show real values when `raw_watch_data` is populated
- [ ] No hardcoded delta strings (`+18m`, `+12%`, `+5%`) anywhere in `HealthScreen.jsx`
- [ ] `loadData` reads `result.metrics[0]` not bare `result`

### VOS-057 (Minor fixes)
- [ ] Chat header shows "Qwen2.5 Assistant"
- [ ] Planner subtitle "Auto-archives at midnight" on one line
- [ ] Compose button shows Alert on tap

---

## Rules to Follow

- **Rule 30 (Git Worktree Isolation):** Work in `feature/blue/055-056-057-mobile-ui-alignment`. Do not touch `staging` directly.
- **OLED Theme (Rule 20):** No new hex codes outside the `palette` object. Import `palette` from `theme.ts` for all colours.
- **Rule 09 (Dependency Veto):** Do NOT install any new packages. `@expo/vector-icons` is already in the SDK. If you find yourself writing `npm install X`, stop and ask Mr. Pink.
- **Rule 15 (Refactoring Protocol):** Only change the lines required to fix the bug. Do not refactor surrounding code unless it blocks the fix.
- **Rule 11 (Handoff Standard):** Your handoff letter must include ADB screenshots of each fixed screen compared to the ground truth image paths.
- **Rule 27 (No AI Attribution):** All commits signed as `Mr. Blue`. No "Co-authored-by Claude" or similar.

---

## Testing on Device

After building and installing:

```bash
cd mobile
npm run android  # or: adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Take ADB screenshots for each screen:
```bash
adb -s RFCY504R60T exec-out screencap -p > /tmp/test_plan.png
adb -s RFCY504R60T exec-out screencap -p > /tmp/test_health.png
adb -s RFCY504R60T exec-out screencap -p > /tmp/test_chat.png
```

Include these screenshots in your handoff letter alongside the ground truth images for side-by-side comparison.

---

**Mr. Pink** — SuperCyan Project Manager & Scout
*Audit doc: `docs/AUDIT_MOBILE_PINK_2026-03-17.md` — B-03, B-04, B-05, B-06, B-07, B-08, B-09*
