---
description: Governs the deployment of Qwen3-Coder-30B-A3B-Instruct-GGUF on Cloud Run with a single NVIDIA L4 GPU.
trigger: glob
globs: vllm_deployment/**, .github/workflows/**
---

# Rule 23: Cloud Run GPU Governance — Qwen3-Coder-30B-A3B-Instruct-GGUF

## Context

VibeOS deploys the **Qwen3-Coder-30B-A3B-Instruct-GGUF** model via llama.cpp on Google Cloud Run with a single NVIDIA L4 GPU (24GB VRAM). The 30B model at Q4_K_S quantization requires ~19.5GB VRAM for weights, leaving ~4.5GB for KV cache. This makes Cloud Run with scale-to-zero the optimal deployment target.

**Model change history:** Originally Qwen3.5-9B-Instruct (vision-language). Upgraded 2026-03-19 to Qwen3-Coder-30B for enhanced tool execution and reasoning.

## Model Specification

| Property | Value |
|----------|-------|
| HuggingFace Model ID | `unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF` |
| Quantization | `Q4_K_S` (GGUF) |
| Architecture | `Qwen2_5` (30B MoE) |
| Modality | Text-only (Tool-Use / Logic optimized) |
| Native Context Length | 32,768 tokens (VibeOS uses 8,192) |
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
| Q4_K_S model weights | ~19.5 GB |
| KV cache (8192 context, 8 seqs) | ~4.2 GB |
| **Total** | **~23.7 GB** |
| **L4 headroom** | **~0.3 GB buffer** |

The model fits comfortably. No multi-GPU gymnastics required.

## Verification Protocol

- Any PR altering `vllm_deployment/` must be audited for:
  - "Quantization Drift" — accidentally reverting to FP16/BF16 unquantized.
  - "Tensor Parallel Creep" — adding `--tensor-parallel-size > 1` (not needed for 9B).
  - "Missing `--enforce-eager`" — omitting this flag will cause VL model instability.
  - "`--max-model-len` bloat" — values above 16384 waste pre-allocated KV cache on a 9B model.
- Verify `--limit-mm-per-prompt` is present to prevent OOM from unbounded image inputs.
