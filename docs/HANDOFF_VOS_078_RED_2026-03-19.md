# HANDOFF — VOS-078: Instruct Model & Tool Deployment (Phase 1)
**Agent:** Mr. Red  
**Date:** 2026-03-19  

## Objective
Migrate the VibeOS vLLM Cloud Run deployment from the Base model to the highly capable reasoning & execution agent: `unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF`.

## Required Changes
### 1. `vllm_deployment/deploy.sh` & `backend/deploy.sh`
- Update the canonical `MODEL_NAME` variable to point to `unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF`.
- Ensure the Docker download pipeline explicitly pulls the `Qwen3-Coder-30B-A3B-Instruct-Q4_K_S.gguf` file to fit perfectly within the 24GB L4 GPU VRAM limits.

### 2. `vllm_deployment/Dockerfile` & vLLM Startup Arguments
- Ensure the vLLM server process configure the `--enable-auto-tool-choice` startup flag. This is strictly required to process OpenAI tool arrays sent from the backend.

## Verification
- Run the container locally or via your deploy scripts and verify that a `curl` to `/v1/models` returns the updated `Instruct` model name.
- Ensure the container deployment logs clearly show the Tool Calling/OpenAI API parsing schemas successfully initializing.
