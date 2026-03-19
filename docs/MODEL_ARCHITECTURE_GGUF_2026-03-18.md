# VibeOS Model Architecture — GGUF Edition (2026-03-18)

> **This is the authoritative current architecture document.**
> The GPTQ-Int4 attempt (`docs/MODEL_ARCHITECTURE_2026-03-18.md`) is superseded and retained for history only.

---

## Three-Model Architecture

| Target | Model | Hardware | HF Model ID |
|--------|-------|----------|-------------|
| `cloud` (default) | Qwen3.5-35B-A3B Q4_K_M | Cloud Run L4 24GB, europe-west1 | `unsloth/Qwen3.5-35B-A3B-GGUF` (file: `Qwen3.5-35B-A3B-Q4_K_M.gguf`) |
| `home_pc` | Qwen3.5-9B-Claude-4.6-HighIQ | RTX 4070 Ti (local), accessed via Tailscale | `DavidAU/Qwen3.5-9B-Claude-4.6-HighIQ-INSTRUCT` |
| `device` | Qwen3.5-2B-GPT-5.1-HighIQ | On-device mobile (local only) | `DavidAU/Qwen3.5-2B-GPT-5.1-HighIQ-INSTRUCT` |

---

## Why GGUF / llama.cpp (not vLLM)

vLLM does not support GGUF format. GGUF is the llama.cpp native format.

GPTQ-Int4 was attempted first but OOM'd on L4:
- Weights claimed ~17.5GB theoretical, but PyTorch allocated 21.35GB in practice (quantization overhead, activation buffers)
- Only 337MB free — not enough for any KV cache
- L4 24GB is genuinely too small for GPTQ-Int4 35B at full utilization

GGUF Q4_K_M is more memory-efficient in practice:
- ~19.5GB disk, but llama.cpp loads only what fits and manages KV cache separately
- `--ctx-size 4096` keeps the KV cache within the ~4.5GB headroom

---

## Inference Stack Change: vLLM → llama.cpp

| | Before | After |
|---|---|---|
| Base image | `vllm/vllm-openai:latest` | `ghcr.io/ggerganov/llama.cpp:server-cuda` |
| Model format | GPTQ Int4 (`.safetensors`) | GGUF Q4_K_M (`.gguf`) |
| Server | vLLM OpenAI API server | llama.cpp server |
| API | `/v1/chat/completions` | `/v1/chat/completions` (identical) |
| Startup probe | `GET /v1/models` | `GET /health` (503 while loading, 200 when ready) |
| Model name enforcement | Strict | None (llama.cpp ignores `model` field in requests) |

**Backend code is unchanged.** The API contract is identical.

---

## Key vLLM Flags Removed (not applicable to llama.cpp)

| Flag | Reason removed |
|------|---------------|
| `--quantization gptq` | llama.cpp handles quantization natively via GGUF format |
| `--dtype float16` | Not a concept in llama.cpp (GGUF has embedded dtype) |
| `--trust-remote-code` | Not applicable |
| `--max-num-seqs` | Replaced by `-np` (parallel sequences) |
| `--gpu-memory-utilization` | Replaced by `-ngl` (GPU layer offload) |
| `--max-model-len` | Replaced by `--ctx-size` |
| `HF_HUB_OFFLINE=1` | Not needed — llama.cpp has no HuggingFace dependency at runtime |

---

## Environment Variables

```env
# Cloud (llama.cpp on Cloud Run)
QWEN_ENDPOINT_URL=https://vibeos-qwen-<hash>.europe-west1.run.app/v1
QWEN_MODEL_NAME=Qwen/Qwen3.5-35B-A3B-GGUF

# Home PC (Ollama/vLLM on RTX 4070 Ti, accessed via Tailscale)
OLLAMA_ENDPOINT_URL=http://<TAILSCALE_IP>:11434
OLLAMA_MODEL_NAME=DavidAU/Qwen3.5-9B-Claude-4.6-HighIQ-INSTRUCT
```

---

## Mr Pink's Checklist — Remaining Files to Update

All references to old model names (`Qwen3.5-9B-Instruct`, `Qwen2.5`, `GPTQ-Int4`) in non-deployment files:

### Web Frontend (`/web/src/`)

| File | Line | Change |
|------|------|--------|
| `web/src/components/layout/Sidebar.tsx` | 232 | Display label: update `Qwen3.5-9B-Instruct` → `Qwen3.5-35B` |
| `web/src/services/feedService.ts` | 16 | Remove stale mock feed item referencing old model |

### Mobile Frontend (`/mobile/src/`)

| File | Line | Change |
|------|------|--------|
| `mobile/src/screens/ChatScreen.jsx` | 75 | Header: `Qwen2.5 Assistant` → `Qwen3.5 Assistant` |
| `mobile/src/screens/SettingsScreen.jsx` | 57 | Display: `Qwen3.5-9B-Instruct` → `Qwen3.5-35B (Cloud)` |
| `mobile/src/services/feedService.ts` | 13 | Remove stale mock feed item |

### Documentation

| File | Action |
|------|--------|
| `CLAUDE.md` lines 11, 52, 104 | Update model name references |
| `GEMINI.md` same lines | Mirror update |
| `docs/Tech_spec.md` lines 17-19 | Update all three tier descriptions |

### Agent Rules & Skills

| File | Action |
|------|--------|
| `.agent/rules/behavioral-compliance/21-ai-behavioral-consistency.md` | Update model name, param count, note llama.cpp inference stack |
| `.agent/skills/multi-model-inference-router/SKILL.md` | Rewrite all three model rows (IDs, sizes, VRAM, server type) |

### Backend Deploy Script

| File | Line | Change |
|------|------|--------|
| `backend/deploy.sh` | 46-47 | `QWEN_MODEL_NAME` env var in loop → `Qwen/Qwen3.5-35B-A3B-GGUF` |

### E2E Tests

| File | Line | Change |
|------|------|--------|
| `e2e/tests/vos055-057-blue-audit.spec.ts` | 183-186 | Update expected ChatScreen header string |

---

## Deployment Notes (for future agents)

- **Multi-stage Docker build**: Stage 1 (Python) downloads the GGUF file via `hf_hub_download`. Stage 2 (llama.cpp CUDA) copies it in. This keeps the final image clean without needing Python in the runtime image.
- **`-ngl 999`**: Offloads all model layers to GPU. Required for GPU inference.
- **`--ctx-size 4096`**: Do not increase without profiling VRAM. Q4_K_M weights use ~19.5GB, leaving ~4.5GB for KV cache on L4. At ctx 4096 with 16 parallel sequences, KV cache per sequence is manageable.
- **Startup probe uses `/health`**: llama.cpp returns `503 {"status":"loading model"}` during load and `200 {"status":"ok"}` when ready. This is more reliable than `/v1/models` for llama.cpp.
- **Model name in requests**: llama.cpp ignores the `model` field in `/v1/chat/completions` requests — it serves whatever is loaded. The `--alias` flag sets what `/v1/models` returns for display purposes only.
