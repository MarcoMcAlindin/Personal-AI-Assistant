---
description: Governs the deployment of Qwen3.5-9B-Instruct on Cloud Run with a single NVIDIA L4 GPU.
trigger: glob
globs: vllm_deployment/**, .github/workflows/**
---

# Rule 23: Cloud Run GPU Governance — Qwen3.5-9B-Instruct

## Context

VibeOS deploys the **Qwen3.5-9B-Instruct** vision-language model via vLLM on Google Cloud Run with a single NVIDIA L4 GPU (24GB VRAM). The 9B model at 8-bit quantization requires ~7-9GB VRAM for weights, leaving ample headroom for KV cache and vision encoder overhead. This makes Cloud Run with scale-to-zero the optimal deployment target.

**Model change history:** Originally Qwen3.5-9B-Instruct (required 2x L4 on GCE). Downgraded 2026-03-15 due to GPU quota constraints. Rule 24 (GCE multi-GPU) is now deprecated.

## Model Specification

| Property | Value |
|----------|-------|
| HuggingFace Model ID | `Qwen/Qwen3.5-9B-Instruct` |
| Pre-quantized Alternative | `RedHatAI/Qwen3.5-9B-Instruct-quantized.w8a8` (preferred for production) |
| Architecture | `Qwen2_5_VLForConditionalGeneration` |
| Modality | Text + Image + Video (vision-language) |
| Native Context Length | 32,768 tokens |
| License | Apache 2.0 |
| Minimum vLLM Version | **v0.8.5+** |

## Mandatory Deployment Constraints

### 1. Infrastructure (Mr. Red)

- **Platform:** Google Cloud Run (NOT GCE). Scale-to-zero is mandatory.
- **GPU:** Single NVIDIA L4 (24GB VRAM). Do NOT request multiple GPUs.
- **Region:** `europe-west1` (existing project region).
- **No tensor parallelism.** `--tensor-parallel-size` must be `1` or omitted entirely.
- **`--enforce-eager` is REQUIRED** for VL (vision-language) models. Disables CUDA graph capture which causes instability with the vision encoder. Non-negotiable.

### 2. Quantization Strategy

**Preferred (production):** Use the pre-quantized W8A8 model:
```
--model RedHatAI/Qwen3.5-9B-Instruct-quantized.w8a8
```
- No `--quantization` flag needed (quantization is embedded in the model weights).
- No `--dtype` override needed.
- 1.2-1.5x faster than baseline with 99.93% accuracy recovery.
- vLLM-native — no additional dependencies.

**Fallback (if W8A8 unavailable):** Use BitsAndBytes on-the-fly quantization:
```
--model Qwen/Qwen3.5-9B-Instruct
--quantization bitsandbytes
--dtype float16
```
- Requires `bitsandbytes` package in the container.
- `--dtype float16` is mandatory (bitsandbytes does not support bfloat16).

### 3. vLLM Serve Command (Reference)

```bash
vllm serve RedHatAI/Qwen3.5-9B-Instruct-quantized.w8a8 \
  --port 8080 \
  --trust-remote-code \
  --enforce-eager \
  --max-model-len 8192 \
  --gpu-memory-utilization 0.90 \
  --max-num-seqs 16 \
  --limit-mm-per-prompt '{"image":2,"video":0}'
```

### 4. Vision-Language Specific

- **`--limit-mm-per-prompt '{"image":2,"video":0}'`** — Caps multimodal inputs per request. High-resolution images can generate up to 16,384 visual tokens each, which will consume significant KV cache memory. This flag prevents OOM from large image payloads.
- **`--trust-remote-code`** — Required for all Qwen models.
- The OpenAI-compatible `/v1/chat/completions` endpoint works identically for text-only requests. Vision is additive — image inputs use the standard OpenAI vision message format.

### 5. Cloud Run Configuration

- **`min-instances=0`** — Scale-to-zero is mandatory for dev/staging (Rule 08).
- **Startup probe:** `initialDelaySeconds >= 30` (9B model loads in ~15-30 seconds, much faster than 9B).
- **Request timeout:** 300 seconds (accommodates cold start + inference).
- **Concurrency:** Set to `16` (matches `--max-num-seqs`). Do NOT use the Cloud Run default of 80.
- **Instance-based billing:** Required for GPU workloads.

### 6. VRAM Budget

| Component | Estimated VRAM |
|-----------|---------------|
| W8A8 model weights | ~7-9 GB |
| KV cache (8192 context, 16 seqs) | ~4-6 GB |
| Vision encoder overhead | ~2-3 GB (per high-res image) |
| **Total** | **~13-18 GB** |
| **L4 headroom** | **6-11 GB buffer** |

The model fits comfortably. No multi-GPU gymnastics required.

## Verification Protocol

- Any PR altering `vllm_deployment/` must be audited for:
  - "Quantization Drift" — accidentally reverting to FP16/BF16 unquantized.
  - "Tensor Parallel Creep" — adding `--tensor-parallel-size > 1` (not needed for 9B).
  - "Missing `--enforce-eager`" — omitting this flag will cause VL model instability.
  - "`--max-model-len` bloat" — values above 16384 waste pre-allocated KV cache on a 9B model.
- Verify `--limit-mm-per-prompt` is present to prevent OOM from unbounded image inputs.
