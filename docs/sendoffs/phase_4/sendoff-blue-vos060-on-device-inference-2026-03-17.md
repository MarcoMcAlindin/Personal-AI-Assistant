# Sendoff Letter: Mr. Blue — On-Device Inference (VOS-060)

**From:** Mr. Pink (Project Manager & Scout)
**To:** Mr. Blue (Frontend & Mobile Architect)
**Date:** 2026-03-17
**Priority:** HIGH — enables full offline AI on Samsung Galaxy S25
**Issue:** VOS-060 — https://github.com/MarcoMcAlindin/Personal-AI-Assistant/issues/75
**Skill:** `.agent/skills/multi-model-inference-router/SKILL.md`
**Depends on:** VOS-059 merged to staging first (ModelContext must exist)

---

## What You Are Building

On-device inference for the Samsung Galaxy S25 (Adreno GPU) using `llama.rn` (React Native bindings for `llama.cpp`). The user selects "On-Device (3.8B)" from the model pill selector (VOS-059), the app checks if the model GGUF is downloaded, and if so sends messages directly to the local model with no network call.

**Model:** Phi-3.5-mini-instruct Q4_K_M (2.4GB GGUF)
**Library:** `llama.rn` — already installed in this repo via VOS-052
**Branch:** `feature/blue/060-on-device-inference`

---

## Pre-Check: Confirm llama.rn is Installed

```bash
cd mobile && cat package.json | grep llama
```

If `llama.rn` is not listed, install it:
```bash
npm install llama.rn
npx pod-install  # iOS only — skip for Android
```

The VOS-052 bare workflow migration (`expo prebuild`) already ran — llama.rn is compatible with the current native build.

---

## Task Steps

### Step 1 — Prime your worktree

```bash
git fetch origin staging
git worktree add /home/marco/supercyan-worktrees/blue-060 feature/blue/060-on-device-inference
cd /home/marco/supercyan-worktrees/blue-060
# Rebase on staging after VOS-059 merges:
git rebase origin/staging
```

### Step 2 — Add model download utilities to `api.js`

**File:** `mobile/src/services/api.js`

Add the following functions (full patterns in skill file):

```javascript
import * as FileSystem from 'expo-file-system';
import { LlamaContext } from 'llama.rn';

const MODEL_HF_URL = 'https://huggingface.co/bartowski/Phi-3.5-mini-instruct-GGUF/resolve/main/Phi-3.5-mini-instruct-Q4_K_M.gguf';
export const DEVICE_MODEL_PATH = `${FileSystem.documentDirectory}models/phi35mini_q4km.gguf`;

export async function downloadDeviceModel(onProgress) {
  await FileSystem.makeDirectoryAsync(
    `${FileSystem.documentDirectory}models/`,
    { intermediates: true }
  );
  const dl = FileSystem.createDownloadResumable(
    MODEL_HF_URL,
    DEVICE_MODEL_PATH,
    {},
    ({ totalBytesWritten, totalBytesExpectedToWrite }) =>
      onProgress(totalBytesWritten / totalBytesExpectedToWrite)
  );
  await dl.downloadAsync();
}

let _llamaContext = null;

export async function loadDeviceModel(modelPath) {
  _llamaContext = await LlamaContext.create({
    model: modelPath,
    n_gpu_layers: 99,   // offload all layers to Adreno GPU
    n_ctx: 4096,
  });
}

export async function sendChatDevice(message, history = []) {
  if (!_llamaContext) throw new Error('On-device model not loaded');
  const result = await _llamaContext.completion({
    messages: [
      { role: 'system', content: 'You are SuperCyan Assistant.' },
      ...history,
      { role: 'user', content: message },
    ],
    n_predict: 512,
    temperature: 0.7,
  });
  return { response: result.text };
}
```

**Update `sendChatWithModel`** to replace the stub:
```javascript
case 'device': return sendChatDevice(message, history);
```

### Step 3 — Add download/load flow to `ChatScreen.jsx`

When the user selects "On-Device" and the model is not yet downloaded, show a download prompt instead of the message input.

**Import additions:**
```javascript
import {
  downloadDeviceModel,
  loadDeviceModel,
  DEVICE_MODEL_PATH,
  sendChatDevice,
} from '../services/api';
import * as FileSystem from 'expo-file-system';
import { useModel } from '../services/modelContext';
```

**State additions in `ChatScreen`:**
```javascript
const { selectedModel, deviceModelLoaded, setDeviceModelLoaded } = useModel();
const [downloadProgress, setDownloadProgress] = useState(null); // null = not downloading, 0-1 = progress
```

**Check model file on mount (or when device is selected):**
```javascript
useEffect(() => {
  if (selectedModel !== 'device') return;
  FileSystem.getInfoAsync(DEVICE_MODEL_PATH).then(info => {
    if (info.exists) {
      loadDeviceModel(DEVICE_MODEL_PATH).then(() => setDeviceModelLoaded(true));
    }
  });
}, [selectedModel]);
```

**Download handler:**
```javascript
const handleDownloadModel = async () => {
  setDownloadProgress(0);
  try {
    await downloadDeviceModel(p => setDownloadProgress(p));
    await loadDeviceModel(DEVICE_MODEL_PATH);
    setDeviceModelLoaded(true);
    setDownloadProgress(null);
  } catch (e) {
    setDownloadProgress(null);
    Alert.alert('Download Failed', e.message);
  }
};
```

**Conditional UI** — when `selectedModel === 'device'` and `!deviceModelLoaded`:

```jsx
{selectedModel === 'device' && !deviceModelLoaded && (
  <View style={{
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: palette.borderColor,
  }}>
    {downloadProgress === null ? (
      <>
        <Text style={{ color: palette.textPrimary, marginBottom: 8, textAlign: 'center' }}>
          On-device model not downloaded yet.{'\n'}Phi-3.5-mini Q4_K_M · 2.4 GB
        </Text>
        <TouchableOpacity
          onPress={handleDownloadModel}
          style={{
            backgroundColor: palette.accentPrimary,
            borderRadius: 20,
            paddingHorizontal: 24,
            paddingVertical: 10,
          }}
        >
          <Text style={{ color: '#000', fontWeight: 'bold' }}>Download Model</Text>
        </TouchableOpacity>
      </>
    ) : (
      <>
        <Text style={{ color: palette.textMuted, marginBottom: 8 }}>
          Downloading… {Math.round(downloadProgress * 100)}%
        </Text>
        <View style={{
          width: '100%',
          height: 4,
          backgroundColor: palette.borderColor,
          borderRadius: 2,
        }}>
          <View style={{
            width: `${Math.round(downloadProgress * 100)}%`,
            height: 4,
            backgroundColor: palette.accentPrimary,
            borderRadius: 2,
          }} />
        </View>
      </>
    )}
  </View>
)}
```

When `deviceModelLoaded` is true, show the normal input bar.

### Step 4 — Update model status dot for device model

In the `modelStatuses` object in ChatScreen, update the device entry to reflect real state:

```javascript
const modelStatuses = {
  cloud: 'ready',  // VOS-054 will make this dynamic later
  home_pc: 'ready',
  device: deviceModelLoaded ? 'ready' : 'not_ready',
};
```

### Step 5 — Rebuild native Android

The llama.rn native module requires a full native rebuild:

```bash
cd /home/marco/supercyan-worktrees/blue-060/mobile
npm run android
```

If llama.rn was freshly installed, also run:
```bash
cd android && ./gradlew clean && cd ..
npm run android
```

### Step 6 — Test on device

**Test 1 — First launch with device model selected:**
1. Select "On-Device" pill
2. "Download Model" button appears with size note (2.4 GB)
3. Tap download — progress bar fills
4. After download, input bar appears
5. Send a message — response comes from local model (no network required)

**Test 2 — After restart:**
1. Close and reopen app
2. Select "On-Device" pill
3. Model loads automatically (no re-download)
4. Chat works immediately

**Test 3 — Offline mode:**
1. Enable airplane mode
2. Select "On-Device" and send message
3. Response arrives (confirming no network dependency)

ADB screenshots:
```bash
adb -s RFCY504R60T exec-out screencap -p > /tmp/test_device_download.png
adb -s RFCY504R60T exec-out screencap -p > /tmp/test_device_chat.png
```

### Step 7 — Commit

```bash
git add mobile/src/services/api.js mobile/src/screens/ChatScreen.jsx
git commit -m "[VOS-060][Blue] feat: on-device inference — llama.rn + Phi-3.5-mini Q4_K_M download + Adreno GPU"
```

### Step 8 — Create PR

```bash
gh pr create --base staging \
  --title "[VOS-060][Blue] feat: On-Device Inference — llama.rn Phi-3.5-mini on S25" \
  --body "Implements on-device inference using llama.rn with Phi-3.5-mini Q4_K_M (2.4GB). Download flow with progress bar. Auto-loads on subsequent launches. Adreno GPU acceleration via n_gpu_layers=99. Depends on VOS-059."
```

---

## Acceptance Criteria

- [ ] `downloadDeviceModel()` and `loadDeviceModel()` added to `api.js`
- [ ] `sendChatDevice()` added to `api.js` using `_llamaContext.completion()`
- [ ] `sendChatWithModel` dispatches to `sendChatDevice` for `'device'` model
- [ ] When device model not downloaded: "Download Model" button visible with size info
- [ ] Download shows real progress bar (0–100%)
- [ ] After download completes: model auto-loads and input bar appears
- [ ] App restart with device model already downloaded: model loads automatically
- [ ] Chat response arrives in offline/airplane mode (no network needed)
- [ ] Status dot for device pill turns green after model is loaded
- [ ] `n_gpu_layers: 99` set (Adreno GPU offload)

---

## Rules to Follow

- **Rule 30 (Git Worktree):** Work in `feature/blue/060-on-device-inference`. Rebase on staging after VOS-059 merges.
- **Rule 09 (Dependency Veto):** `llama.rn` and `expo-file-system` are already installed. Do NOT add new packages.
- **Rule 20 (OLED Theme):** All colours via `palette`. The progress bar uses `palette.accentPrimary`.
- **Rule 08 (Do NOT Bundle GGUF):** The 2.4GB model must be downloaded on first use. Never include it in the APK or git repo.
- **Rule 15 (Refactoring Protocol):** Only modify the lines required. Do not reorganise `ChatScreen.jsx`.
- **Rule 11 (Handoff Standard):** Include ADB screenshots of the download screen AND an on-device chat response in your handoff.
- **Rule 27 (No AI Attribution):** Signed as `Mr. Blue`.

---

## Performance Expectations

| Metric | Expected |
|--------|----------|
| Model load time (cold) | 3–8 seconds |
| First token latency | 1–3 seconds |
| Throughput | 50–100 tok/s (Adreno GPU) |
| RAM usage | ~2.5 GB |

If performance is worse than expected, verify `n_gpu_layers: 99` is set — without it, inference falls back to CPU at ~5 tok/s.

---

**Mr. Pink** — SuperCyan Project Manager & Scout
*Model research: Phi-3.5-mini Q4_K_M chosen over Qwen2.5-3B for superior benchmark performance at same size. llama.rn chosen over alternatives for compatibility with existing bare workflow from VOS-052.*
