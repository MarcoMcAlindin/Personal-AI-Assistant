# SENDOFF: VOS-077 — Red GGUF Deployment Migration

**Date:** 2026-03-18
**From:** Mr. Pink
**To:** Mr. Red
**Priority:** CRITICAL — the cloud vLLM container is currently built for GPTQ. It will not load the GGUF model without this change.

---

## Mission

Migrate the vLLM Cloud Run deployment from `Qwen/Qwen3.5-35B-A3B-GPTQ-Int4` (GPTQ) to `unsloth/Qwen3.5-35B-A3B-GGUF` (GGUF Q4_K_M, 22GB).

The GGUF format requires a different Docker build strategy, different vLLM serve flags, and different env vars across the stack.

**Full architecture reference:** `docs/MODEL_ARCHITECTURE_GGUF_2026-03-18.md`

---

## Branch

`feature/red/077-gguf-deployment`

---

## 1. vllm_deployment/Dockerfile

### Why the change
GPTQ used `snapshot_download` to pull the entire model repo at build time.
GGUF requires a **two-component** download: tokenizer from the base Qwen repo + the single GGUF weight file from the Unsloth repo.
`snapshot_download` on the Unsloth GGUF repo would pull ALL quantization variants (200+ GB). We must use `hf_hub_download` for the single file.

### Changes

**Remove:**
```python
from huggingface_hub import snapshot_download
snapshot_download(repo_id="Qwen/Qwen3.5-35B-A3B-GPTQ-Int4", local_dir="/model")
```

**Replace with:**
```python
from huggingface_hub import snapshot_download, hf_hub_download

# Tokenizer only — ignore all weight files
snapshot_download(
    repo_id="Qwen/Qwen3.5-35B-A3B",
    local_dir="/model/tokenizer",
    ignore_patterns=["*.safetensors", "*.bin", "*.pt", "*.gguf"]
)

# Single GGUF weight file
hf_hub_download(
    repo_id="unsloth/Qwen3.5-35B-A3B-GGUF",
    filename="Qwen3.5-35B-A3B-Q4_K_M.gguf",
    local_dir="/model"
)
```

**Remove vLLM serve flags:**
```
--quantization gptq
```

**Add vLLM serve flags:**
```
--gguf-file /model/Qwen3.5-35B-A3B-Q4_K_M.gguf
--language-model-only
--reasoning-parser qwen3
--gpu-memory-utilization 0.95
```

**Update model path argument** from `Qwen/Qwen3.5-35B-A3B-GPTQ-Int4` to `/model/tokenizer`.

**Full vLLM serve command:**
```bash
vllm serve /model/tokenizer \
  --gguf-file /model/Qwen3.5-35B-A3B-Q4_K_M.gguf \
  --language-model-only \
  --max-model-len 4096 \
  --reasoning-parser qwen3 \
  --gpu-memory-utilization 0.95 \
  --port 8000
```

**`HF_HUB_OFFLINE=1`** — keep this. Weights are baked in; no network calls at startup.

---

## 2. vllm_deployment/service.yaml

```yaml
# Change:
- name: MODEL_NAME
  value: "Qwen/Qwen3.5-35B-A3B-GPTQ-Int4"

# To:
- name: MODEL_NAME
  value: "unsloth/Qwen3.5-35B-A3B-GGUF"
```

---

## 3. vllm_deployment/deploy.sh

Update the `MODEL` or `QWEN_MODEL_NAME` variable:

```bash
# Change:
MODEL=Qwen/Qwen3.5-35B-A3B-GPTQ-Int4

# To:
MODEL=unsloth/Qwen3.5-35B-A3B-GGUF
```

---

## 4. vllm_deployment/cloudbuild.yaml

Update the comment referencing the model name.

---

## 5. vllm_deployment/scripts/analyze_health.py (line 64)

```python
# Change:
QWEN_MODEL_NAME = os.environ.get("QWEN_MODEL_NAME", "Qwen/Qwen3.5-35B-A3B-GPTQ-Int4")

# To:
QWEN_MODEL_NAME = os.environ.get("QWEN_MODEL_NAME", "unsloth/Qwen3.5-35B-A3B-GGUF")
```

---

## 6. backend/app/utils/config.py

```python
# Change qwen_model_name default:
qwen_model_name: str = "Qwen/Qwen3.5-35B-A3B-GPTQ-Int4"

# To:
qwen_model_name: str = "unsloth/Qwen3.5-35B-A3B-GGUF"
```

---

## 7. backend/app/api/v1/endpoints.py (both fallback defaults)

```python
# Change (appears twice):
QWEN_MODEL_NAME = os.environ.get("QWEN_MODEL_NAME", "Qwen/Qwen3.5-35B-A3B-GPTQ-Int4")

# To:
QWEN_MODEL_NAME = os.environ.get("QWEN_MODEL_NAME", "unsloth/Qwen3.5-35B-A3B-GGUF")
```

---

## 8. backend/app/services/ai_service.py

Update comment and any `OLLAMA_MODEL_NAME` or `QWEN_MODEL_NAME` fallback that still references the old GPTQ string.

---

## 9. backend/.env.example

```env
# Change:
QWEN_MODEL_NAME=Qwen/Qwen3.5-35B-A3B-GPTQ-Int4

# To:
QWEN_MODEL_NAME=unsloth/Qwen3.5-35B-A3B-GGUF
```

---

## 10. .env.example (root)

Same change as backend/.env.example.

---

## 11. backend/deploy.sh (line 47)

```bash
# Change:
"QWEN_MODEL_NAME:Qwen/Qwen3.5-35B-A3B-GPTQ-Int4"

# To:
"QWEN_MODEL_NAME:unsloth/Qwen3.5-35B-A3B-GGUF"
```

This was originally VOS-076. Merge into this branch — no need for a separate PR.

---

## VRAM Budget Warning

| Component | Size |
|-----------|------|
| GGUF weights | ~22 GB |
| L4 total VRAM | 24 GB |
| Headroom for KV cache | ~2 GB |

- Set `--max-model-len 4096` to stay within budget.
- Set `--gpu-memory-utilization 0.95` to use nearly all VRAM for weights.
- `--language-model-only` saves ~1–2 GB by skipping the vision encoder.

---

## Definition of Done

- `grep -r "GPTQ" vllm_deployment/ backend/` returns no hits.
- `grep -r "Qwen3.5-35B-A3B-GPTQ" . --include="*.py" --include="*.sh" --include="*.yaml" --include="*.env*"` returns no hits.
- Docker build succeeds locally (or in Cloud Build).
- Health probe confirms vLLM loads and `/v1/models` returns `unsloth/Qwen3.5-35B-A3B-GGUF`.
- Handoff to Mr. Pink for audit.
