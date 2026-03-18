---
name: multi-model-inference-router
description: Architecture and implementation patterns for routing VibeOS chat between three inference backends — Cloud vLLM (35B), Home PC Ollama (9B), and On-Device (2B). Covers model selector UI, routing logic, and connection handling for each backend.
---

# Multi-Model Inference Router

## When to use this skill

- When implementing VOS-059, VOS-060, VOS-061, or VOS-062
- When adding a new inference backend to the VibeOS chat pipeline
- When wiring the model selector UI to different API call paths

## Architecture Overview

```
User picks model
      │
      ├─ "Cloud (35B)" ─────► POST /api/v1/chat  ──────► Cloud Run vLLM
      │                        (with RAG context)          Qwen3.5-35B-A3B-GPTQ-Int4
      │
      ├─ "Home PC (9B)" ────► Direct HTTP to Ollama ────► RTX 4070 Ti (Tailscale)
      │                        (no RAG in phase 1)         Qwen3.5-9B-Claude-4.6-HighIQ
      │
      └─ "On-Device (2B)" ──► llama.rn local ──────────► S25 Adreno GPU
                               (no network)                Qwen3.5-2B-GPT-5.1-HighIQ
```

## Model Reference Table

| Backend | Model ID | Size | VRAM/RAM | Perf | API |
|---------|----------|------|----------|------|-----|
| Cloud vLLM | `unsloth/Qwen3.5-35B-A3B-GGUF` (file: `Qwen3.5-35B-A3B-Q4_K_M.gguf`) | 35B MoE (GGUF Q4_K_M, 22GB) | L4 24GB | ~20-30 tok/s | OpenAI compat |
| Home PC Ollama | `DavidAU/Qwen3.5-9B-Claude-4.6-HighIQ-INSTRUCT` | 9B | ~6GB | 40-80 tok/s | OpenAI compat |
| On-Device llama.rn | `DavidAU/Qwen3.5-2B-GPT-5.1-HighIQ-INSTRUCT` | 2B | ~1.5GB RAM | 50-100 tok/s | llama.rn API |

## Model Context (`mobile/src/services/modelContext.js`)

```javascript
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ModelContext = createContext(null);

export function ModelProvider({ children }) {
  const [selectedModel, setSelectedModelState] = useState('cloud');
  const [ollamaUrl, setOllamaUrlState] = useState('');
  const [deviceModelLoaded, setDeviceModelLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.multiGet(['SELECTED_MODEL', 'OLLAMA_HOST_URL']).then(pairs => {
      const model = pairs[0][1] || 'cloud';
      const url = pairs[1][1] || '';
      setSelectedModelState(model);
      setOllamaUrlState(url);
    });
  }, []);

  const setSelectedModel = (m) => {
    setSelectedModelState(m);
    AsyncStorage.setItem('SELECTED_MODEL', m);
  };

  const setOllamaUrl = (url) => {
    setOllamaUrlState(url);
    AsyncStorage.setItem('OLLAMA_HOST_URL', url);
  };

  return (
    <ModelContext.Provider value={{
      selectedModel, setSelectedModel,
      ollamaUrl, setOllamaUrl,
      deviceModelLoaded, setDeviceModelLoaded,
    }}>
      {children}
    </ModelContext.Provider>
  );
}

export const useModel = () => useContext(ModelContext);
```

Wrap `App.jsx` in `<ModelProvider>`.

## Routing Function (`mobile/src/services/api.js` additions)

```javascript
import { LlamaContext } from 'llama.rn';  // only imported when needed

// Ollama (Home PC) — direct call, OpenAI-compatible
export async function sendChatOllama(message, ollamaUrl) {
  if (!ollamaUrl) throw new Error('Ollama host URL not configured');
  const res = await fetch(`${ollamaUrl.replace(/\/$/, '')}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'DavidAU/Qwen3.5-9B-Claude-4.6-HighIQ-INSTRUCT',
      messages: [
        { role: 'system', content: 'You are VibeOS Assistant.' },
        { role: 'user', content: message },
      ],
      stream: false,
    }),
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
  const data = await res.json();
  return { response: data.choices[0].message.content };
}

// On-device — llama.rn (no network)
let _llamaContext = null;

export async function loadDeviceModel(modelPath, onProgress) {
  _llamaContext = await LlamaContext.create({
    model: modelPath,
    n_gpu_layers: 99,   // offload all to Adreno
    n_ctx: 4096,
  });
}

export async function sendChatDevice(message, history = []) {
  if (!_llamaContext) throw new Error('On-device model not loaded');
  const result = await _llamaContext.completion({
    messages: [
      { role: 'system', content: 'You are VibeOS Assistant.' },
      ...history,
      { role: 'user', content: message },
    ],
    n_predict: 512,
    temperature: 0.7,
  });
  return { response: result.text };
}

// Unified dispatch
export async function sendChatWithModel(message, model, { ollamaUrl, history } = {}) {
  switch (model) {
    case 'cloud':   return sendChat(message);
    case 'home_pc': return sendChatOllama(message, ollamaUrl);
    case 'device':  return sendChatDevice(message, history);
    default:        return sendChat(message);
  }
}
```

## Ollama PC Setup Reference

```bash
# 1. Install
curl -fsSL https://ollama.com/install.sh | sh

# 2. Start with LAN binding
OLLAMA_HOST=0.0.0.0:11434 ollama serve

# 3. Pull model
ollama pull DavidAU/Qwen3.5-9B-Claude-4.6-HighIQ-INSTRUCT

# 4. Test
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"DavidAU/Qwen3.5-9B-Claude-4.6-HighIQ-INSTRUCT","messages":[{"role":"user","content":"hello"}],"stream":false}'
```

## On-Device Model Download

```javascript
import * as FileSystem from 'expo-file-system';

// GGUF quantized version of DavidAU/Qwen3.5-2B-GPT-5.1-HighIQ-INSTRUCT
const MODEL_HF_URL = 'https://huggingface.co/DavidAU/Qwen3.5-2B-GPT-5.1-HighIQ-INSTRUCT-GGUF/resolve/main/Qwen3.5-2B-GPT-5.1-HighIQ-INSTRUCT-Q4_K_M.gguf';
export const DEVICE_MODEL_PATH = `${FileSystem.documentDirectory}models/qwen35_2b_q4km.gguf`;

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
```

## Model Selector UI Pattern

```jsx
const MODELS = [
  { id: 'cloud',   label: 'Cloud',    sub: '35B',  icon: 'cloud-outline' },
  { id: 'home_pc', label: 'Home PC',  sub: '9B',   icon: 'desktop-outline' },
  { id: 'device',  label: 'On-Device',sub: '2B',   icon: 'phone-portrait-outline' },
];

function ModelSelectorRow({ selected, onSelect, statuses }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 8 }}>
      {MODELS.map(m => (
        <TouchableOpacity
          key={m.id}
          onPress={() => onSelect(m.id)}
          style={{
            flexDirection: 'row', alignItems: 'center',
            borderRadius: 20,
            backgroundColor: selected === m.id ? palette.accentPrimary : 'transparent',
            borderWidth: 1,
            borderColor: selected === m.id ? palette.accentPrimary : palette.borderColor,
            paddingHorizontal: 12, paddingVertical: 6,
            marginHorizontal: 4,
          }}
        >
          <View style={{
            width: 6, height: 6, borderRadius: 3,
            backgroundColor: statuses[m.id] === 'ready' ? '#4ade80' : '#ef4444',
            marginRight: 6,
          }} />
          <Text style={{ color: selected === m.id ? '#000' : palette.textPrimary, fontSize: 12 }}>
            {m.label}
          </Text>
          <Text style={{ color: selected === m.id ? '#00000088' : palette.textMuted, fontSize: 10, marginLeft: 4 }}>
            {m.sub}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
```

## Forbidden Patterns

- **Do NOT use the model selector for RAG or Supabase auth** — those are cloud-only. On-device and home PC models use local/simple context.
- **Do NOT bundle the GGUF file in the APK** — it is ~1.5GB. Always download on first use.
- **Do NOT call `sendChat()` (the cloud path) when home_pc or device is selected** — route via the correct function.
- **Do NOT hardcode the Ollama model name** — read from user-configurable setting or a constant.
