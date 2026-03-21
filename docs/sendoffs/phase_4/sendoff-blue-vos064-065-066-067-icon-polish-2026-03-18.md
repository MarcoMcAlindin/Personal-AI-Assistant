# Sendoff Letter: Mr. Blue — Icon & Color Polish (VOS-064/065/066/067)

**From:** Mr. Pink (Project Manager & Scout)
**To:** Mr. Blue (Frontend & Mobile Architect)
**Date:** 2026-03-18
**Priority:** HIGH — visual regression, off-brand emoji throughout
**Issues:**
- VOS-064: https://github.com/MarcoMcAlindin/Personal-AI-Assistant/issues/82
- VOS-065: https://github.com/MarcoMcAlindin/Personal-AI-Assistant/issues/83
- VOS-066: https://github.com/MarcoMcAlindin/Personal-AI-Assistant/issues/84
- VOS-067: https://github.com/MarcoMcAlindin/Personal-AI-Assistant/issues/85
**Skill:** `.agent/skills/expo-ionicons-tab-navigator/SKILL.md` (applies — same Ionicons import pattern)

---

## Context

VOS-055 fixed the tab bar icons. The same emoji-in-Text pattern remains in three more screens:
Planner header and toolbar buttons, Health header and metric card icons, Chat save/pin buttons
and user bubble colour. These are the final emoji stragglers before the app is visually shippable.

Batch all four into one PR: `feature/blue/064-065-066-067-icon-polish`.

---

## VOS-064 — PlannerScreen: Header Icon + Toolbar Buttons

**File:** `mobile/src/screens/PlannerScreen.jsx`

### Header calendar icon (line 139)

**Current:**
```jsx
<View style={{ width: 40, height: 40, borderRadius: 8,
  backgroundColor: palette.bgCard, alignItems: 'center', justifyContent: 'center',
  marginRight: spacing.md, borderWidth: 1, borderColor: palette.accentPrimary }}>
  <Text style={{ fontSize: 18 }}>{'\uD83D\uDCC5'}</Text>
</View>
```

**Replace with:**
```jsx
import { Ionicons } from '@expo/vector-icons';

<View style={{ width: 36, height: 36, borderRadius: 8,
  backgroundColor: palette.bgCard, alignItems: 'center', justifyContent: 'center',
  marginRight: spacing.md, borderWidth: 1, borderColor: palette.accentPrimary }}>
  <Ionicons name="calendar-outline" size={20} color={palette.accentPrimary} />
</View>
```

### Toolbar buttons (lines 149, 152, 155)

**Current:**
```jsx
<Text style={{ color: palette.textMuted, fontSize: 16 }}>{'\u2630'}</Text>   // list
<Text style={{ color: palette.textMuted, fontSize: 16 }}>{'\u2B1A'}</Text>   // grid
<Text style={{ color: palette.textMuted, fontSize: 16 }}>{'\uD83D\uDDD1\uFE0F'}</Text> // trash
```

**Replace with:**
```jsx
<Ionicons name="list-outline" size={18} color={palette.textMuted} />
<Ionicons name="grid-outline" size={18} color={palette.textMuted} />
<Ionicons name="trash-outline" size={18} color={palette.textMuted} />
```

---

## VOS-065 — HealthScreen: Header Icon + MetricCard Icons

**File:** `mobile/src/screens/HealthScreen.jsx`

### Header heart icon (line 99)

**Current:**
```jsx
<Text style={{ fontSize: 18 }}>{'\u2764\uFE0F'}</Text>
```

Find the surrounding View and replace with:
```jsx
<Ionicons name="heart-outline" size={20} color={palette.accentSecondary} />
```

(`palette.accentSecondary` is the green — matches the ground truth small green heart.)

### MetricCard icons (lines 11-17)

**Current:**
```javascript
const METRIC_ICONS = {
  'Sleep': '\uD83C\uDF19',
  'Avg HR': '\u2764\uFE0F',
  'Deep Sleep': '\uD83E\uDDE0',
  'REM': '\uD83C\uDF19',
};
```

**Replace:** Remove the `METRIC_ICONS` dict entirely and update `MetricCard` to use Ionicons inline:

```jsx
const METRIC_ICON_MAP = {
  'Sleep':      { name: 'moon-outline',        color: '#818CF8' },
  'Avg HR':     { name: 'heart-outline',        color: '#F87171' },
  'Deep Sleep': { name: 'bed-outline',          color: '#60A5FA' },
  'REM':        { name: 'cloud-outline',        color: '#A78BFA' },
};

function MetricCard({ label, value, unit, delta }) {
  const iconSpec = METRIC_ICON_MAP[label];
  // inside the card render, replace the Text icon with:
  {iconSpec && (
    <Ionicons name={iconSpec.name} size={14} color={iconSpec.color} style={{ marginRight: spacing.xs }} />
  )}
```

Also remove the Water Intake emoji (line 134):
```jsx
// Current:
<Text style={{ ... }}>{'\uD83D\uDCA7'} Water Intake</Text>
// Replace with: (just remove the emoji, keep the text)
<Text style={{ ... }}>Water Intake</Text>
```

---

## VOS-066 — ChatScreen: Save/Pin/Link Button Icons

**File:** `mobile/src/screens/ChatScreen.jsx`

### ChatHeader save button (line 82)

**Current:**
```jsx
<Text style={{ color: '#000', fontSize: 12, fontWeight: '600' }}>{'\uD83D\uDCBE'}</Text>
```
**Replace with:**
```jsx
<Ionicons name="bookmark-outline" size={14} color="#000" />
```

### ChatHeader link button (line 89)

**Current:**
```jsx
<Text style={{ fontSize: 12 }}>{'\uD83D\uDD17'}</Text>
```
**Replace with:**
```jsx
<Ionicons name="link-outline" size={14} color={palette.textMuted} />
```

### Message row save action (line 222)

**Current:**
```jsx
<Text style={{ color: palette.textMuted, fontSize: 12 }}>{'\uD83D\uDCBE'}</Text>
```
**Replace with:**
```jsx
<Ionicons name="bookmark-outline" size={14} color={palette.textMuted} />
```

### Message row pin action (line 225)

**Current:**
```jsx
<Text style={{ color: palette.textMuted, fontSize: 12 }}>{'\uD83D\uDD12'}</Text>
```
**Replace with:**
```jsx
<Ionicons name="pin-outline" size={14} color={palette.textMuted} />
```

---

## VOS-067 — ChatScreen: User Bubble Color + Avatar Size

**File:** `mobile/src/screens/ChatScreen.jsx`

### User bubble background color (line 194)

**Current:**
```jsx
backgroundColor: isUser ? palette.accentPrimary : palette.bgCard,
```

`palette.accentPrimary` is `#00D4FF` — full-brightness cyan. Ground truth shows a dark muted teal.

**Replace with:**
```jsx
backgroundColor: isUser ? '#0E7490' : palette.bgCard,
```

`#0E7490` is Tailwind `cyan-800` — dark teal, still readable on OLED, not blinding.

### User message text color (line 203)

When background changes to dark teal, text must be white not black:
```jsx
// Current:
color: isUser ? '#000' : palette.textPrimary,
// Replace:
color: isUser ? '#FFFFFF' : palette.textPrimary,
```

### User avatar (line 210 area)

The right-side avatar box (shown when `isUser`) uses `palette.accentPrimary` background. Align it:
```jsx
// Find: backgroundColor: palette.accentPrimary, (inside the isUser avatar View)
// Replace: backgroundColor: '#0E7490',
```

---

## Task Steps

### Step 1 — Set up worktree

```bash
cd "/home/marco/Personal AI Assistant"
git worktree list
# Blue's existing worktree is on feature/blue/055-056-057-mobile-ui-alignment (merged)
# Create a new branch from staging:
git worktree add /home/marco/supercyan-worktrees/blue-064 feature/blue/064-065-066-067-icon-polish
cd /home/marco/supercyan-worktrees/blue-064
```

Alternatively, reset the existing blue worktree if cleaner:
```bash
cd /home/marco/supercyan-worktrees/blue
git fetch origin staging
git checkout -b feature/blue/064-065-066-067-icon-polish origin/staging
```

### Step 2 — Implement all four VOS fixes

Apply each change above. All are in:
- `mobile/src/screens/PlannerScreen.jsx`
- `mobile/src/screens/HealthScreen.jsx`
- `mobile/src/screens/ChatScreen.jsx`

Ensure `import { Ionicons } from '@expo/vector-icons';` is at the top of each file (already present in TabNavigator from VOS-055 — confirm import works in each screen file by checking if `@expo/vector-icons` is in `mobile/package.json`).

### Step 3 — Build and test

```bash
cd /home/marco/supercyan-worktrees/blue-064/mobile
npm install
bash build-android.sh   # or: npm run android
```

Visual checks:
1. Planner tab → header shows teal `calendar-outline` icon, toolbar shows `list/grid/trash` Ionicons, zero emoji visible
2. Health tab → header shows green `heart-outline`, metric cards show small icon glyphs (not moon/heart/brain emoji)
3. Chat tab → ChatHeader save=`bookmark-outline`, link=`link-outline`. Message row save=`bookmark-outline`, pin=`pin-outline`.
4. Chat tab → send a message. Your bubble is dark teal (`#0E7490`), white text. AI bubble is card-background with primary text. No blinding cyan bubbles.

### Step 4 — Commit

```bash
git add mobile/src/screens/PlannerScreen.jsx \
        mobile/src/screens/HealthScreen.jsx \
        mobile/src/screens/ChatScreen.jsx
git commit -m "[VOS-064/065/066/067][Blue] feat: replace remaining emoji with Ionicons, fix chat bubble teal"
```

### Step 5 — PR

```bash
gh pr create --base staging \
  --title "[VOS-064/065/066/067] Mobile icon polish — Ionicons + chat bubble teal" \
  --body "Replaces all remaining emoji in Planner/Health/Chat screens with @expo/vector-icons Ionicons.
Fixes chat user bubble from blinding #00D4FF cyan to dark teal #0E7490.
Closes #82 #83 #84 #85"
```

---

## Acceptance Criteria

- [ ] PlannerScreen header: `calendar-outline` Ionicon, no calendar emoji
- [ ] PlannerScreen toolbar: `list-outline`, `grid-outline`, `trash-outline` Ionicons
- [ ] HealthScreen header: `heart-outline` Ionicon (green)
- [ ] HealthScreen MetricCards: small Ionicon glyphs, no moon/brain/heart emoji
- [ ] ChatScreen header buttons: `bookmark-outline` and `link-outline` Ionicons
- [ ] ChatScreen message row: `bookmark-outline` and `pin-outline` action icons
- [ ] Chat user bubble: dark teal `#0E7490`, white text — no bright cyan
- [ ] Build compiles without error, APK installable on device

---

## Rules to Follow

- **Rule 30 (Git Worktree):** All work in `feature/blue/064-065-066-067-icon-polish`. Never commit to staging directly.
- **Rule 23 (Skill Compliance):** The `expo-ionicons-tab-navigator` skill is the canonical reference for the Ionicons import pattern and active/inactive color scheme.
- **Rule 20 (Self-Healing):** Dark teal `#0E7490` for user bubbles should be added to `theme.ts` as `palette.userBubble` so it can be reused. Note this in your handoff.
- **Rule 10 (Definition of Done):** Build proof in handoff (at minimum log output confirming APK built with 0 errors).
- **Rule 11 (Handoff Standard):** Include before/after screenshots if possible using `adb exec-out screencap -p > before.png` pattern from your prior session.

---

**Mr. Pink** — SuperCyan Project Manager & Scout
*Board: VOS-064/065/066/067 → In Progress*
