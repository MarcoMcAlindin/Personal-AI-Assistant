# HANDOFF — VOS-077: GGUF Deployment Migration
**Agent:** Mr. Red  
**Date:** 2026-03-19  
**Branch:** `feature/red/077-gguf-deployment`  
**Status:** Ready for Mr. Pink Audit

---

## Summary

Migrated the SuperCyan vLLM Cloud Run deployment from a compile-from-source `llama-cpp-python` approach to the official `ghcr.io/ggerganov/llama.cpp:server-cuda` pre-built image. Fixed all stale model name references across `vllm_deployment` and `backend` to reflect the canonical `Qwen/Qwen3.5-35B-A3B-GGUF` model.

---

## Root Cause of Prior Deployment Failure

The previous `Dockerfile` used `nvidia/cuda:12.4.1-devel-ubuntu22.04` as the runtime base and compiled `llama-cpp-python[server]` from source with `CMAKE_ARGS=-DGGML_CUDA=on`. Cloud Build workers are CPU-only — they have no CUDA-capable GPU. This meant:

- The pre-built `cu124` wheel from `abetlen.github.io/llama-cpp-python` was unavailable for the exact Python version on the base image, causing a fallback to source compilation.
- `nvcc` attempting to compile CUDA GPU kernels on a CPU-only Cloud Build worker either errors immediately or produces a broken CPU-only binary.
- The resulting container crashed at runtime on Cloud Run when trying to offload layers to the L4 GPU.

---

## Files Changed

| File | Change |
|------|--------|
| `vllm_deployment/Dockerfile` | **Rewritten**: two-stage build — Python slim downloader (hf_hub_download single GGUF file) → official `ghcr.io/ggerganov/llama.cpp:server-cuda` runtime (pre-built binary, no compilation) |
| `vllm_deployment/cloudbuild.yaml` | Updated stale GPTQ comment to reference GGUF two-stage build |
| `vllm_deployment/deploy.sh` | Updated stale comments + fixed `MODEL_NAME` env var from `Qwen/Qwen3.5-9B-Instruct` → `Qwen/Qwen3.5-35B-A3B-GGUF` |
| `backend/deploy.sh` | Fixed line 47: `QWEN_MODEL_NAME` override in deployment loop — was `Qwen/Qwen3.5-9B-Instruct`, now `Qwen/Qwen3.5-35B-A3B-GGUF` |
| `backend/app/services/ai_service.py` | Updated header comment from stale 9B/vLLM reference to current GGUF 35B + Ollama multi-model architecture |

---

## Architecture Reference

Architecture is fully documented in `docs/MODEL_ARCHITECTURE_GGUF_2026-03-18.md`.

Key facts:
- **Runtime image:** `ghcr.io/ggerganov/llama.cpp:server-cuda` (pre-built binary)
- **Model:** `unsloth/Qwen3.5-35B-A3B-GGUF` — single file `Qwen3.5-35B-A3B-Q4_K_M.gguf` (~19.5GB)
- **GPU layers:** `-ngl 999` (all layers to L4 GPU)
- **Context:** `--ctx-size 4096` (safe within ~4.5GB KV cache headroom on L4 24GB)
- **Startup probe:** `/health` (returns 503 while loading, 200 when ready)
- **API contract:** Identical `/v1/chat/completions` — no backend code changes required

---

## Verification Steps

```bash
# 1. Confirm no stale model name references in Red's domain
grep -r "Qwen3.5-9B-Instruct" vllm_deployment/ backend/deploy.sh
grep -r "GPTQ" vllm_deployment/ backend/app/services/ai_service.py
# Expected: zero matches

# 2. Confirm Dockerfile uses official llama.cpp image
grep "FROM" vllm_deployment/Dockerfile
# Expected:
#   FROM python:3.12-slim AS downloader
#   FROM ghcr.io/ggerganov/llama.cpp:server-cuda

# 3. Post-deploy: probe /health endpoint
TOKEN=$(gcloud auth print-identity-token)
curl -H "Authorization: Bearer $TOKEN" https://supercyan-qwen-<hash>.europe-west1.run.app/health
# Expected: {"status":"ok"}
```

---

## Boundary Confirmation

Mr. Red operated strictly within:
- `vllm_deployment/` — Dockerfile, deploy.sh, cloudbuild.yaml
- `backend/deploy.sh` — deployment configuration only (not application logic)
- `backend/app/services/ai_service.py` — header comment update only (no logic changes)

No frontend code (`/web`, `/mobile`), database migrations (`/supabase`), or FastAPI routes (`endpoints.py`) were modified.

---

## Notes for Pink Audit

- VOS-076 (backend/deploy.sh model name fix) is fully absorbed by this PR as specified in the VOS-077 issue body.
- The `ollama_model_name` fallback in `ai_service.py` was `qwen2.5:7b` on staging — left unchanged as that is Mr. Green's Ollama configuration, not in Mr. Red's domain.
