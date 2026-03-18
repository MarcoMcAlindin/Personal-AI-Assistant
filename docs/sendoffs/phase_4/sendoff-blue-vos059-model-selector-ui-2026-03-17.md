# Sendoff Letter: Mr. Blue — Model Selector UI (VOS-059)

**From:** Mr. Pink (Project Manager & Scout)
**To:** Mr. Blue (Frontend & Mobile Architect)
**Date:** 2026-03-17
**Priority:** HIGH — foundation for the multi-model feature; VOS-060 and VOS-061 both depend on this
**Issue:** VOS-059 — https://github.com/MarcoMcAlindin/Personal-AI-Assistant/issues/74
**Skill:** `.agent/skills/multi-model-inference-router/SKILL.md`

---

## What You Are Building

A three-way model selector that lets the user choose between:
1. **Cloud (9B)** — existing vLLM on Cloud Run (`Qwen/Qwen3.5-9B`)
2. **Home PC (7B)** — Ollama on RTX 4070 Ti, direct LAN/Tailscale HTTP
3. **On-Device (3.8B)** — llama.rn on Samsung S25 Adreno GPU (Phi-3.5-mini)

This task is **UI and state management only**. You are not implementing the actual inference for Home PC or On-Device yet — those are VOS-061 and VOS-060. Your job is: the selector pill row, the ModelContext, persistence to AsyncStorage, and the Ollama URL field in Settings.

**Branch:** `feature/blue/059-model-selector-ui`

---

## Task Steps

### Step 1 — Prime your worktree

```bash
git worktree list
git worktree add /home/marco/vibeos-worktrees/blue-059 feature/blue/059-model-selector-ui
cd /home/marco/vibeos-worktrees/blue-059
```

### Step 2 — Create `ModelContext`

**New file:** `mobile/src/services/modelContext.js`

Read `.agent/skills/multi-model-inference-router/SKILL.md` in full before writing. The complete implementation is there. Key points:

- Three state values: `selectedModel` (`'cloud'` | `'home_pc'` | `'device'`), `ollamaUrl` (string), `deviceModelLoaded` (boolean)
- Persist `selectedModel` and `OLLAMA_HOST_URL` to `AsyncStorage`
- Default `selectedModel` to `'cloud'` on first launch
- Export `useModel()` hook

```javascript
// Default value — never null
const [selectedModel, setSelectedModelState] = useState('cloud');
```

### Step 3 — Wrap `App.jsx` in `<ModelProvider>`

**File:** `mobile/App.jsx` (or `mobile/src/App.jsx` — check which one is used)

```jsx
import { ModelProvider } from './src/services/modelContext';

// Wrap the root navigator:
export default function App() {
  return (
    <ModelProvider>
      {/* existing navigator tree */}
    </ModelProvider>
  );
}
```

Do NOT restructure the existing provider tree — just wrap the outermost element.

### Step 4 — Add `ModelSelectorRow` to `ChatScreen.jsx`

**File:** `mobile/src/screens/ChatScreen.jsx`

Read the full `ModelSelectorRow` component in the skill file. Key requirements:

**Import:**
```javascript
import { useModel } from '../services/modelContext';
```

**In the component body:**
```javascript
const { selectedModel, setSelectedModel } = useModel();
```

**Status dots** — hardcode all three as `'ready'` for now (VOS-060 and VOS-061 will wire real readiness):
```javascript
const modelStatuses = { cloud: 'ready', home_pc: 'ready', device: 'ready' };
```

**Placement:** The `ModelSelectorRow` goes directly above the message input area (below the message list, above the text field). It must NOT go in the header.

**OLED styling:** All colours from `palette` only. Active background: `palette.accentPrimary`. Active text: `'#000'`. Inactive border: `palette.borderColor`. Inactive text: `palette.textPrimary`.

**Status dot colours:**
- `'ready'` → `#4ade80` (green)
- anything else → `#ef4444` (red)

### Step 5 — Add Ollama URL field to `SettingsScreen.jsx`

**File:** `mobile/src/screens/SettingsScreen.jsx`

```javascript
import { useModel } from '../services/modelContext';

// In component:
const { ollamaUrl, setOllamaUrl } = useModel();
```

Add a settings section (after the existing vLLM section, before the end of the scroll view):

```jsx
<Text style={styles.sectionHeader}>Home PC (Ollama)</Text>
<Text style={styles.label}>Ollama Host URL</Text>
<TextInput
  style={styles.input}
  value={ollamaUrl}
  onChangeText={setOllamaUrl}
  placeholder="http://192.168.x.x:11434"
  placeholderTextColor={palette.textMuted}
  autoCapitalize="none"
  autoCorrect={false}
  keyboardType="url"
/>
<Text style={[styles.hint, { marginTop: 4 }]}>
  Include protocol and port. Leave blank if not using Home PC model.
</Text>
```

Use the same `styles.input` and `styles.label` as existing inputs in SettingsScreen. Do not add new style definitions if equivalent ones exist.

### Step 6 — Wire `sendChat` dispatch in `ChatScreen.jsx`

The `handleSend` function currently calls `sendChat(message)` unconditionally. Update it to use `selectedModel`:

```javascript
import { sendChatWithModel } from '../services/api';

// In handleSend:
const data = await sendChatWithModel(userMessage, selectedModel, {
  ollamaUrl,
  history: messages.map(m => ({ role: m.role, content: m.content })),
});
```

You also need to add the `sendChatWithModel` stub to `api.js` (just the dispatch function — the actual `sendChatOllama` and `sendChatDevice` implementations come in VOS-061 and VOS-060):

```javascript
// In mobile/src/services/api.js — add at bottom:
export async function sendChatWithModel(message, model, { ollamaUrl, history } = {}) {
  switch (model) {
    case 'cloud':   return sendChat(message);
    case 'home_pc': throw new Error('Home PC model not yet configured (VOS-061)');
    case 'device':  throw new Error('On-device model not yet loaded (VOS-060)');
    default:        return sendChat(message);
  }
}
```

This ensures the dispatch is wired correctly and fails with a clear error instead of silently using cloud when another model is selected.

### Step 7 — Commit

```bash
git add mobile/src/services/modelContext.js \
        mobile/App.jsx \
        mobile/src/screens/ChatScreen.jsx \
        mobile/src/screens/SettingsScreen.jsx \
        mobile/src/services/api.js
git commit -m "[VOS-059][Blue] feat: model selector UI — ModelContext, three-pill picker, Ollama URL setting"
```

### Step 8 — Test on device

```bash
cd mobile && npm run android
```

Verify:
1. Chat screen shows three pills: Cloud · Home PC · On-Device
2. Tapping each changes the active pill (fills with cyan)
3. Selected model persists across app restart (close app, reopen — same pill selected)
4. Settings screen has Ollama URL field; typing in it persists after app restart
5. Selecting Cloud and sending a message works as before (no regression)
6. Selecting Home PC or On-Device shows a clear error message (not silent fail)

ADB screenshot:
```bash
adb -s RFCY504R60T exec-out screencap -p > /tmp/test_model_selector.png
```

### Step 9 — Create PR

```bash
gh pr create --base staging \
  --title "[VOS-059][Blue] feat: Model Selector UI — Cloud / Home PC / On-Device" \
  --body "Adds ModelContext with AsyncStorage persistence, three-pill selector in ChatScreen, Ollama URL field in Settings. Wires sendChatWithModel dispatch (stubs for VOS-060/061)."
```

---

## Acceptance Criteria

- [ ] `ModelContext` created at `mobile/src/services/modelContext.js` with `selectedModel`, `ollamaUrl`, `deviceModelLoaded`
- [ ] `App.jsx` wrapped in `<ModelProvider>` — all screens can call `useModel()`
- [ ] Chat screen shows three-pill row: Cloud (9B) · Home PC (7B) · On-Device (3.8B)
- [ ] Active pill: filled cyan (`palette.accentPrimary`) background, black text
- [ ] Inactive pill: transparent background, `palette.borderColor` border
- [ ] Small coloured dot (6x6dp) per pill (green = ready, red = not ready)
- [ ] `selectedModel` and `ollamaUrl` persist to AsyncStorage across restarts
- [ ] Settings screen has Ollama Host URL text field
- [ ] `sendChatWithModel` in `api.js` dispatches to correct function (throws descriptive error for unimplemented backends)
- [ ] Cloud model still works — zero regression on existing chat flow

---

## Rules to Follow

- **Rule 30 (Git Worktree):** Work in `feature/blue/059-model-selector-ui`. Never commit to `staging`.
- **Rule 20 (OLED Theme):** All colours from `palette` import. No hardcoded hex except the dot green/red which are standard status colours.
- **Rule 09 (Dependency Veto):** `AsyncStorage` is already installed (`@react-native-async-storage/async-storage`). Do NOT install anything new.
- **Rule 15 (Refactoring Protocol):** Touch only the lines needed. Do not reorganise `ChatScreen.jsx` layout.
- **Rule 11 (Handoff Standard):** Include ADB screenshot of the three-pill selector on device in your handoff letter.
- **Rule 27 (No AI Attribution):** Commit signed as `Mr. Blue`. No Claude references.

---

## Dependency Note

VOS-059 is the **blocker** for VOS-060 and VOS-061. Both of those tasks assume `ModelContext` and `sendChatWithModel` exist. Complete and merge VOS-059 to `staging` before those tasks begin.

VOS-062 (Green) adds `model_target` to the backend `/chat` route — that's independent and can run in parallel with this task.

---

**Mr. Pink** — VibeOS Project Manager & Scout
*Research: multi-model-inference-router skill — `.agent/skills/multi-model-inference-router/SKILL.md`*
