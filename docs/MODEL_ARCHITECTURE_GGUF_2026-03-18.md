# VibeOS Model Architecture — GGUF Update — 2026-03-18

> **Supersedes:** `docs/MODEL_ARCHITECTURE_2026-03-18.md` (GPTQ-Int4 version)
> The cloud model has moved from `Qwen/Qwen3.5-35B-A3B-GPTQ-Int4` to `unsloth/Qwen3.5-35B-A3B-GGUF`.

---

## Three-Model Architecture

VibeOS uses three distinct inference backends. The `model_target` field on `/chat` requests controls routing.

| Target | Model | Hardware | HF Repo |
|--------|-------|----------|---------|
| `cloud` (default) | Qwen3.5-35B-A3B Q4_K_M | Cloud Run L4 24GB, europe-west1 | `unsloth/Qwen3.5-35B-A3B-GGUF` |
| `home_pc` | Qwen3.5-9B-Claude-4.6-HighIQ | RTX 4070 Ti (Tailscale) | `DavidAU/Qwen3.5-9B-Claude-4.6-HighIQ-INSTRUCT` |
| `device` | Qwen3.5-2B-GPT-5.1-HighIQ | On-device mobile (local only) | `DavidAU/Qwen3.5-2B-GPT-5.1-HighIQ-INSTRUCT` |

### Three Canonical Model Strings

- **Cloud**: `unsloth/Qwen3.5-35B-A3B-GGUF` (file: `Qwen3.5-35B-A3B-Q4_K_M.gguf`)
- **Home PC**: `DavidAU/Qwen3.5-9B-Claude-4.6-HighIQ-INSTRUCT`
- **Mobile/Device**: `DavidAU/Qwen3.5-2B-GPT-5.1-HighIQ-INSTRUCT`

---

## Why GGUF Q4_K_M for Cloud?

`Qwen3.5-35B-A3B-Q4_K_M.gguf` is a 22GB quantized GGUF from Unsloth's Dynamic 2.0 quantization pipeline, which provides superior accuracy vs standard Q4_K_M at the same size. The model is a 35B MoE with only 3B activated parameters per token — fast inference, full weight footprint in VRAM.

**VRAM budget on L4 (24GB):**
- Model weights: ~22 GB
- KV cache headroom: ~2 GB
- `--max-model-len` must be capped at **4096** to stay within budget
- `--language-model-only` flag removes the vision encoder, freeing ~1–2 GB additional headroom

---

## Model Properties

| Property | Value |
|----------|-------|
| Architecture | MoE, 256 experts (8 routed + 1 shared activated) |
| Total parameters | 35B |
| Activated parameters | ~3B per token |
| Context window | 262,144 (use 4096 for L4 single-GPU budget) |
| Quantization | GGUF Q4_K_M (4-bit, medium K precision) |
| File size | 22 GB |
| Thinking mode | ON by default — emits `<think>...</think>` tags |
| Vision | Multimodal capable, but deploy with `--language-model-only` for text-only path |

---

## vLLM Deployment — GGUF Serving Pattern

GGUF requires a **two-component download** at Docker build time:

```python
# 1. Tokenizer only (no weights)
from huggingface_hub import snapshot_download
snapshot_download(
    repo_id="Qwen/Qwen3.5-35B-A3B",
    local_dir="/model/tokenizer",
    ignore_patterns=["*.safetensors", "*.bin", "*.pt", "*.gguf"]
)

# 2. GGUF weight file only
from huggingface_hub import hf_hub_download
hf_hub_download(
    repo_id="unsloth/Qwen3.5-35B-A3B-GGUF",
    filename="Qwen3.5-35B-A3B-Q4_K_M.gguf",
    local_dir="/model"
)
```

**vLLM serve command:**

```bash
vllm serve /model/tokenizer \
  --gguf-file /model/Qwen3.5-35B-A3B-Q4_K_M.gguf \
  --language-model-only \
  --max-model-len 4096 \
  --reasoning-parser qwen3 \
  --gpu-memory-utilization 0.95 \
  --port 8000
```

**Key flag differences from GPTQ deployment:**

| Flag | GPTQ (old) | GGUF (new) |
|------|-----------|-----------|
| `--quantization` | `gptq` | Remove — GGUF handles internally |
| `--gguf-file` | Not used | `Qwen3.5-35B-A3B-Q4_K_M.gguf` |
| `--language-model-only` | Not used | Required (saves VRAM, text-only) |
| `--max-model-len` | 8192 | 4096 (tighter VRAM budget) |
| `--reasoning-parser` | Not used | `qwen3` (strips `<think>` at vLLM level) |
| `HF_HUB_OFFLINE=1` | Yes | Yes (weights baked into image) |

---

## Thinking Mode

The model outputs `<think>...</think>` tags by default. Two layers of protection:

1. **vLLM level**: `--reasoning-parser qwen3` strips think blocks before streaming to the backend.
2. **Backend level**: The `strip_think_tags` utility (added in VOS-063) strips any residual think tags from the response body before it reaches the frontend.

Both layers must remain active. Do not remove either.

---

## Environment Variables Reference

```env
# Cloud (vLLM on Cloud Run)
QWEN_ENDPOINT_URL=https://vibeos-qwen-<hash>.europe-west1.run.app/v1
QWEN_MODEL_NAME=unsloth/Qwen3.5-35B-A3B-GGUF

# Home PC (Ollama/vLLM on RTX 4070 Ti, accessed via Tailscale)
OLLAMA_ENDPOINT_URL=http://<TAILSCALE_IP>:11434
OLLAMA_MODEL_NAME=DavidAU/Qwen3.5-9B-Claude-4.6-HighIQ-INSTRUCT
```

The `device` target (`DavidAU/Qwen3.5-2B-GPT-5.1-HighIQ-INSTRUCT`) runs entirely on-device and has no backend env var.

---

## Files Updated by Mr. Pink (2026-03-18)

| File | Change |
|------|--------|
| `docs/MODEL_ARCHITECTURE_GGUF_2026-03-18.md` | This document — authoritative reference |
| `.agent/rules/behavioral-compliance/21-ai-behavioral-consistency.md` | Model ID + thinking mode note |
| `.agent/skills/multi-model-inference-router/SKILL.md` | GGUF model ID, VRAM, serve command |
| `CLAUDE.md` | All three model references |
| `GEMINI.md` | Mirror of CLAUDE.md |
| `docs/Tech_spec.md` | Cloud tier updated to GGUF |
| `docs/MODEL_ARCHITECTURE_2026-03-18.md` | SUPERSEDED banner added |

---

## Mr. Pink's Sendoff Checklist — Remaining Work

### Mr. Red (VOS-077) — vLLM Deployment & Backend Config

| File | Change Required |
|------|----------------|
| `vllm_deployment/Dockerfile` | Replace `snapshot_download('Qwen/Qwen3.5-35B-A3B-GPTQ-Int4')` with two-component download (tokenizer + GGUF file). Remove `--quantization gptq`. Add `--gguf-file`, `--language-model-only`, `--reasoning-parser qwen3` |
| `vllm_deployment/service.yaml` | `MODEL_NAME` env var → `unsloth/Qwen3.5-35B-A3B-GGUF` |
| `vllm_deployment/deploy.sh` | `MODEL` env var → `unsloth/Qwen3.5-35B-A3B-GGUF` |
| `vllm_deployment/cloudbuild.yaml` | Update comment |
| `vllm_deployment/scripts/analyze_health.py` | Fallback `QWEN_MODEL_NAME` → `unsloth/Qwen3.5-35B-A3B-GGUF` |
| `backend/app/utils/config.py` | `qwen_model_name` default → `unsloth/Qwen3.5-35B-A3B-GGUF` |
| `backend/app/api/v1/endpoints.py` | Both `QWEN_MODEL_NAME` fallback defaults |
| `backend/app/services/ai_service.py` | Comment + fallback |
| `backend/.env.example` | Cloud model name |
| `.env.example` | Cloud model name |
| `backend/deploy.sh` | Line 47 hardcoded `QWEN_MODEL_NAME` |

### Mr. Blue (VOS-075) — Frontend Labels (unchanged from prior sendoff)

No change to VOS-075. Display labels (`Qwen3.5-35B (Cloud)`, `Cloud (35B)`) remain correct regardless of whether the backend uses GPTQ or GGUF — users see the label, not the HF repo ID.
