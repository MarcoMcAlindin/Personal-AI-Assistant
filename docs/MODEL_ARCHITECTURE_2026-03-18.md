> **SUPERSEDED — 2026-03-18 (later same day)**
> The cloud model has moved from GPTQ-Int4 to GGUF Q4_K_M.
> See `docs/MODEL_ARCHITECTURE_GGUF_2026-03-18.md` for the authoritative current architecture.
> This document is retained for historical reference only.

---

# SuperCyan Model Architecture — 2026-03-18 (GPTQ, superseded)

## Three-Model Architecture

SuperCyan now uses three distinct inference backends depending on context. The `model_target` field on `/chat` requests controls routing.

| Target | Model | Hardware | HF Model ID |
|--------|-------|----------|-------------|
| `cloud` (default) | Qwen3.5-35B-A3B GPTQ Int4 | Cloud Run L4 24GB, europe-west1 | `Qwen/Qwen3.5-35B-A3B-GPTQ-Int4` |
| `home_pc` | Qwen3.5-9B-Claude-4.6-HighIQ | RTX 4070 Ti (local), accessed via Tailscale | `DavidAU/Qwen3.5-9B-Claude-4.6-HighIQ-INSTRUCT` |
| `device` | Qwen3.5-2B-GPT-5.1-HighIQ | On-device mobile (local only) | `DavidAU/Qwen3.5-2B-GPT-5.1-HighIQ-INSTRUCT` |

### Why GPTQ Int4 for Cloud?

`unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF` (Q4_K_S) fits on a single L4 GPU (24GB VRAM) with ~4.5GB KV cache headroom. This keeps the existing Cloud Run architecture, region, and GPU tier intact — no quota changes required.

### Home PC Access from Mobile

When the home PC is on, mobile connects via Tailscale. The backend receives `model_target: "home_pc"` + `ollama_url` pointing to the PC's Ollama/vLLM instance. The `device` target is local-only and is rejected at the backend (400 error) — it never routes through the cloud.

---

## Files That Need Updating — Full Audit

Mr Pink: update every reference below to reflect the new model IDs. The three canonical strings are:

- **Cloud**: `unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF`
- **Home PC**: `DavidAU/Qwen3.5-9B-Claude-4.6-HighIQ-INSTRUCT`
- **Mobile/Device**: `DavidAU/Qwen3.5-2B-GPT-5.1-HighIQ-INSTRUCT`

### Already Updated by Mr Red (2026-03-18)

| File | What Changed |
|------|-------------|
| `vllm_deployment/Dockerfile` | Model → GPTQ-Int4, added `HF_HUB_OFFLINE=1`, added `--quantization gptq`, removed VL-specific flags |
| `vllm_deployment/deploy.sh` | GPU stays `nvidia-l4`, region stays `europe-west1`, model env var updated |
| `vllm_deployment/service.yaml` | `MODEL_NAME` env var updated, egress fixed to `all-traffic` (resolves Errno 101) |
| `vllm_deployment/cloudbuild.yaml` | Comment updated, region stays `europe-west1` |
| `vllm_deployment/scripts/analyze_health.py` | Fallback `QWEN_MODEL_NAME` default updated (line 64) |
| `backend/app/utils/config.py` | `qwen_model_name` + `ollama_model_name` defaults updated |
| `backend/app/api/v1/endpoints.py` | Both `QWEN_MODEL_NAME` fallback defaults updated (lines 168, 241) |
| `backend/app/services/ai_service.py` | Comment + `OLLAMA_MODEL_NAME` fallback default updated |
| `backend/.env.example` | Cloud + home PC model names updated |
| `.env.example` | Cloud model name + region updated |

### Needs Updating — Mr Pink's Checklist

#### Web Frontend (`/web/src/`)

| File | Line | Current Value | Required Change |
|------|------|--------------|-----------------|
| `web/src/components/layout/Sidebar.tsx` | 7-9 | `'Qwen: Offline'`, `'Qwen: Warming Up...'`, `'Qwen: Online'` | Update status labels to reflect model name if desired |
| `web/src/components/layout/Sidebar.tsx` | 232 | `Qwen3.5-9B-Instruct` | Update display label to `Qwen3.5-35B` or `Qwen 35B` |
| `web/src/services/feedService.ts` | 16 | Mock feed item referencing old model name | Update or remove stale mock data |

#### Mobile Frontend (`/mobile/src/`)

| File | Line | Current Value | Required Change |
|------|------|--------------|-----------------|
| `mobile/src/screens/ChatScreen.jsx` | 75 | `Qwen3-Coder-30B` | Update header title |
| `mobile/src/screens/ChatScreen.jsx` | 244, 275 | `Ask Qwen anything...` | Update placeholder text if desired |
| `mobile/src/screens/SettingsScreen.jsx` | 57 | `Qwen3-Coder-30B` | Update display label |
| `mobile/src/services/feedService.ts` | 13 | Mock feed item referencing old model name | Update or remove stale mock data |

#### Documentation

| File | Lines | Issue |
|------|-------|-------|
| `CLAUDE.md` | 11, 52, 104 | References `Qwen3.5-9B-Instruct` — update to `Qwen3.5-35B-A3B-GPTQ-Int4` |
| `GEMINI.md` | Same as CLAUDE.md | Mirror update |
| `docs/Tech_spec.md` | 17-19 | References old model — update all three inference tiers |
| `docs/MODEL_MIGRATION_QWEN25VL_2026-03-15.md` | All | Stale migration doc — archive or supersede with this document |
| `docs/AUDIT_VOS_049_RED_2026-03-16.md` | 9, 12 | References old baked model — note superseded |

#### Agent Rules & Skills

| File | Line | Issue |
|------|------|-------|
| `.agent/rules/behavioral-compliance/21-ai-behavioral-consistency.md` | 8, 11, 13 | Model name and parameter count wrong — update to 35B MoE |
| `.agent/skills/multi-model-inference-router/SKILL.md` | 19, 22, 33-34, 97, 156, 161 | All three model IDs, parameter counts, and VRAM figures need updating |

#### Backend Deploy Script

| File | Line | Issue |
|------|------|-------|
| `backend/deploy.sh` | 46-47 | Hardcoded `QWEN_MODEL_NAME:Qwen/Qwen3.5-9B-Instruct` in env var loop — update to `Qwen/Qwen3.5-35B-A3B-GPTQ-Int4` |

#### E2E Tests

| File | Line | Issue |
|------|------|-------|
| `e2e/tests/vos055-057-blue-audit.spec.ts` | 183-186 | Asserts `Qwen2.5 Assistant` in ChatScreen header — update expected string to match new label |

---

## Environment Variables Reference

```env
# Cloud (vLLM on Cloud Run)
QWEN_ENDPOINT_URL=https://supercyan-qwen-<hash>.europe-west1.run.app/v1
QWEN_MODEL_NAME=Qwen/Qwen3.5-35B-A3B-GPTQ-Int4

# Home PC (Ollama/vLLM on RTX 4070 Ti, accessed via Tailscale)
OLLAMA_ENDPOINT_URL=http://<TAILSCALE_IP>:11434
OLLAMA_MODEL_NAME=DavidAU/Qwen3.5-9B-Claude-4.6-HighIQ-INSTRUCT
```

The `device` target (`DavidAU/Qwen3.5-2B-GPT-5.1-HighIQ-INSTRUCT`) runs entirely on-device in the mobile app and has no backend env var — it never touches the cloud gateway.

---

## vLLM Deployment Notes (for future agents)

- **Quantization**: `--quantization gptq` is set explicitly. GPTQ is also auto-detected by vLLM from `quantization_config` in the model's `config.json`, so this is belt-and-suspenders.
- **`--dtype float16` is REQUIRED**: GPTQ does not support `bfloat16` (vLLM's default). Without this flag the container exits immediately with `torch.bfloat16 is not supported for quantization method gptq`.
- **No `--enforce-eager`**: This is a text-only MoE model. That flag is only required for vision-language models to disable CUDA graph capture.
- **`HF_HUB_OFFLINE=1`**: Model weights are baked into the Docker image at build time via `snapshot_download`. This env var prevents vLLM from making any HuggingFace network calls at container startup — which previously caused `Errno 101 Network is unreachable` failures.
- **VPC egress**: `service.yaml` uses `vpc-access-egress: all-traffic` so all outbound traffic (including any future external calls) routes through Cloud NAT.
- **Cold start budget**: Startup probe allows up to 61 minutes (`60s delay + 120 failures × 30s`). Cold start for a 17.5GB model on L4 is typically 3-8 minutes.
