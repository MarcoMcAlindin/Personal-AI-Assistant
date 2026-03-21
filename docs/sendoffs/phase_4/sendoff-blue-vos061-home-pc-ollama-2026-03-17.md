# Sendoff Letter: Mr. Blue — Home PC Ollama Routing (VOS-061)

**From:** Mr. Pink (Project Manager & Scout)
**To:** Mr. Blue (Frontend & Mobile Architect)
**Date:** 2026-03-17
**Priority:** HIGH — enables RTX 4070 Ti inference via Ollama on home LAN
**Issue:** VOS-061 — https://github.com/MarcoMcAlindin/Personal-AI-Assistant/issues/76
**Skill:** `.agent/skills/multi-model-inference-router/SKILL.md`
**Depends on:** VOS-059 merged to staging first (ModelContext + ollamaUrl must exist)

---

## What You Are Building

A direct HTTP connection from the mobile app to the user's home PC running Ollama with `qwen2.5:7b`. When the user selects "Home PC (7B)" from the model selector, messages are sent directly to the Ollama OpenAI-compatible API at the user-configured URL — bypassing the Cloud Run backend entirely.

**Model:** `qwen2.5:7b` via Ollama
**Target hardware:** NVIDIA RTX 4070 Ti (12GB VRAM, 4.7GB used at Q4)
**Connection:** Direct HTTP (LAN) or Tailscale (remote)
**Branch:** `feature/blue/061-home-pc-ollama`

---

## Task Steps

### Step 1 — Prime your worktree

```bash
git fetch origin staging
git worktree add /home/marco/supercyan-worktrees/blue-061 feature/blue/061-home-pc-ollama
cd /home/marco/supercyan-worktrees/blue-061
# After VOS-059 merges:
git rebase origin/staging
```

### Step 2 — Add `sendChatOllama()` to `api.js`

**File:** `mobile/src/services/api.js`

```javascript
// Home PC Ollama — direct call, OpenAI-compatible
export async function sendChatOllama(message, ollamaUrl) {
  if (!ollamaUrl) throw new Error('Ollama host URL not configured. Set it in Settings → Home PC (Ollama).');
  const base = ollamaUrl.replace(/\/$/, '');
  const res = await fetch(`${base}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen2.5:7b',
      messages: [
        { role: 'system', content: 'You are SuperCyan Assistant.' },
        { role: 'user', content: message },
      ],
      stream: false,
    }),
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status} — is Ollama running at ${base}?`);
  const data = await res.json();
  return { response: data.choices[0].message.content };
}
```

**Update `sendChatWithModel`** to replace the stub:
```javascript
case 'home_pc': return sendChatOllama(message, ollamaUrl);
```

### Step 3 — Add Ollama connection test to `SettingsScreen.jsx`

The user needs to verify their Ollama URL works before trying to chat. Add a "Test Connection" button below the Ollama URL field (which was added in VOS-059).

**File:** `mobile/src/screens/SettingsScreen.jsx`

```javascript
import { sendChatOllama } from '../services/api';

// State:
const [ollamaTestStatus, setOllamaTestStatus] = useState(null); // null | 'testing' | 'ok' | 'error'
const [ollamaTestError, setOllamaTestError] = useState('');

const handleTestOllama = async () => {
  setOllamaTestStatus('testing');
  setOllamaTestError('');
  try {
    const result = await sendChatOllama('Say "OK" and nothing else.', ollamaUrl);
    if (result.response) {
      setOllamaTestStatus('ok');
    } else {
      setOllamaTestStatus('error');
      setOllamaTestError('No response received');
    }
  } catch (e) {
    setOllamaTestStatus('error');
    setOllamaTestError(e.message);
  }
};
```

**UI:**
```jsx
<TouchableOpacity
  onPress={handleTestOllama}
  disabled={!ollamaUrl || ollamaTestStatus === 'testing'}
  style={{
    backgroundColor: ollamaUrl ? palette.accentPrimary : palette.borderColor,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    alignItems: 'center',
  }}
>
  <Text style={{ color: '#000', fontWeight: '600' }}>
    {ollamaTestStatus === 'testing' ? 'Testing…' : 'Test Connection'}
  </Text>
</TouchableOpacity>

{ollamaTestStatus === 'ok' && (
  <Text style={{ color: '#4ade80', marginTop: 4, fontSize: 12 }}>
    Connected — Ollama responded successfully
  </Text>
)}
{ollamaTestStatus === 'error' && (
  <Text style={{ color: '#ef4444', marginTop: 4, fontSize: 12 }}>
    Failed: {ollamaTestError}
  </Text>
)}
```

### Step 4 — Create `docs/home-pc-setup.md`

Create a user-facing setup guide. This is for the repo docs, not the app.

**File:** `docs/home-pc-setup.md`

```markdown
# Home PC Ollama Setup Guide

## Requirements

- NVIDIA GPU with 8GB+ VRAM (RTX 4070 Ti recommended)
- Ubuntu/Windows with NVIDIA drivers installed
- Home WiFi network (or Tailscale for remote access)

## Step 1 — Install Ollama

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

Windows: Download from https://ollama.com/download

## Step 2 — Start Ollama with LAN binding

```bash
OLLAMA_HOST=0.0.0.0:11434 ollama serve
```

This allows connections from other devices on your network.
On Windows, set the environment variable in System Settings, then run `ollama serve`.

## Step 3 — Pull the model

```bash
ollama pull qwen2.5:7b
```

This downloads ~4.7GB. Run once — stays cached.

## Step 4 — Find your PC's local IP

```bash
# Linux/Mac:
ip route get 1 | awk '{print $7}'

# Windows:
ipconfig | findstr "IPv4"
```

## Step 5 — Configure SuperCyan

In the SuperCyan app:
1. Go to **Settings**
2. Under **Home PC (Ollama)**, enter: `http://YOUR_PC_IP:11434`
3. Tap **Test Connection**
4. In Chat, select the **Home PC (7B)** pill

## Remote Access (Tailscale)

To use your home PC from outside your home network:

1. Install Tailscale on both PC and phone: https://tailscale.com/download
2. Sign in on both devices with the same account
3. Get your PC's Tailscale IP: `tailscale ip -4`
4. In SuperCyan Settings, use: `http://TAILSCALE_IP:11434`

Tailscale is free for personal use (up to 3 devices).

## Verify Ollama is running

```bash
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen2.5:7b","messages":[{"role":"user","content":"hello"}],"stream":false}'
```

Expected: JSON response with `choices[0].message.content`.
```

### Step 5 — Update model status dot for home_pc

In `ChatScreen.jsx`, add a connectivity check when `home_pc` is selected:

```javascript
const [homePcReachable, setHomePcReachable] = useState(false);

useEffect(() => {
  if (selectedModel !== 'home_pc' || !ollamaUrl) {
    setHomePcReachable(false);
    return;
  }
  const check = async () => {
    try {
      const res = await fetch(`${ollamaUrl.replace(/\/$/, '')}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      setHomePcReachable(res.ok);
    } catch {
      setHomePcReachable(false);
    }
  };
  check();
  const interval = setInterval(check, 15000);
  return () => clearInterval(interval);
}, [selectedModel, ollamaUrl]);
```

Update `modelStatuses`:
```javascript
const modelStatuses = {
  cloud: 'ready',
  home_pc: homePcReachable ? 'ready' : 'not_ready',
  device: deviceModelLoaded ? 'ready' : 'not_ready',
};
```

### Step 6 — Commit

```bash
git add mobile/src/services/api.js \
        mobile/src/screens/ChatScreen.jsx \
        mobile/src/screens/SettingsScreen.jsx \
        docs/home-pc-setup.md
git commit -m "[VOS-061][Blue] feat: Home PC Ollama routing — sendChatOllama, connection test, reachability dot"
```

### Step 7 — Test on device

**Prerequisites:** Home PC running `OLLAMA_HOST=0.0.0.0:11434 ollama serve` with `qwen2.5:7b` pulled.

**Test 1 — Settings connection test:**
1. Open Settings, enter home PC URL
2. Tap "Test Connection"
3. Should show green "Connected" message

**Test 2 — Chat via Home PC:**
1. Select "Home PC (7B)" pill in Chat
2. Send a message
3. Response arrives from Ollama (check PC terminal — should see the request hit)
4. Status dot is green when Ollama is reachable

**Test 3 — Error handling:**
1. Enter wrong URL in Settings
2. Try to send message
3. Clear error message shown (not crash)

ADB screenshots:
```bash
adb -s RFCY504R60T exec-out screencap -p > /tmp/test_home_pc_settings.png
adb -s RFCY504R60T exec-out screencap -p > /tmp/test_home_pc_chat.png
```

### Step 8 — Create PR

```bash
gh pr create --base staging \
  --title "[VOS-061][Blue] feat: Home PC Ollama routing — direct LAN inference" \
  --body "Adds sendChatOllama() for direct RTX 4070 Ti inference via Ollama. Settings connection tester. Reachability status dot. Home PC setup guide in docs/. Depends on VOS-059."
```

---

## Acceptance Criteria

- [ ] `sendChatOllama(message, ollamaUrl)` added to `api.js` with error handling
- [ ] `sendChatWithModel` routes `'home_pc'` to `sendChatOllama`
- [ ] Settings has "Test Connection" button with pass/fail feedback
- [ ] Home PC status dot is green when Ollama is reachable (checked every 15s)
- [ ] Home PC status dot is red when URL is blank or Ollama is unreachable
- [ ] Sending message with no URL set shows clear error (not silent fail)
- [ ] `docs/home-pc-setup.md` created with Ollama install, LAN binding, Tailscale instructions
- [ ] Tested end-to-end with real Ollama + qwen2.5:7b on home network

---

## Rules to Follow

- **Rule 30 (Git Worktree):** Work in `feature/blue/061-home-pc-ollama`. Rebase on staging after VOS-059.
- **Rule 09 (Dependency Veto):** Only `fetch` (built-in) used for Ollama calls. No new packages.
- **Rule 20 (OLED Theme):** All colours from `palette`.
- **Rule 05 (API Contract):** Do NOT route Home PC traffic through the Cloud Run backend. Direct mobile-to-Ollama only. The backend is cloud-only.
- **Rule 15 (Refactoring Protocol):** Do not restructure SettingsScreen — add the Ollama section where VOS-059 placed the URL field.
- **Rule 11 (Handoff Standard):** ADB screenshot of successful chat via Home PC model, and Settings showing "Connected" status.
- **Rule 27 (No AI Attribution):** Signed as `Mr. Blue`.

---

## Security Note

The Ollama endpoint has no authentication. This is acceptable on a home LAN. When using Tailscale, traffic is encrypted over the Tailscale tunnel. **Do NOT expose `0.0.0.0:11434` to the public internet without a firewall rule.** Include this warning in `docs/home-pc-setup.md`.

---

**Mr. Pink** — SuperCyan Project Manager & Scout
*Model research: qwen2.5:7b chosen for RTX 4070 Ti — 4.7GB Q4 fits easily in 12GB VRAM, 40–80 tok/s, OpenAI-compatible API requires no custom code.*
