# SENDOFF: VOS-045 — Upgrade AI Model to Qwen3.5-9B-Instruct

## 1. Objective
Following the CEO's directive, we are standardizing the SuperCyan intelligence layer. Mr. Red is tasked with upgrading the private inference engine from the deprecated 7B/27B architectures to the **Qwen3.5-9B-Instruct** model. This includes updating the vLLM deployment configuration, the Cloud Run service, and the automated health analysis workflow.

## 2. Technical Domain: Mr. Red (Cloud Intelligence & Automation)
**Codebase Territory:** `/vllm_deployment`, `.github/workflows`, and associated deployment scripts.

## 3. Branch Strategy
- **Base Branch:** `staging`
- **Feature Branch:** `feature/red/045-model-upgrade-qwen9b`

## 4. Implementation Steps

### 4.1. Update vLLM Deployment Infrastructure
- **Modify `vllm_deployment/Dockerfile`:** Ensure `MODEL_NAME` and `CMD` arguments point to `Qwen/Qwen3.5-9B-Instruct`.
- **Modify `vllm_deployment/service.yaml`:** Update the `MODEL_NAME` environment variable.
- **Modify `vllm_deployment/deploy.sh`:** Ensure the `gcloud run deploy` command uses the correct model flags.
- **Quantization Check:** Verify if `fp16` or `awq/gptq` quantization is required for the 9B model to fit within the 24GB VRAM of a single NVIDIA L4 GPU on Cloud Run. (Recommendation: Start with `bf16` or `fp16` as 9B is lightweight).

### 4.2. Update Backend & Service Configs
- **Modify `backend/deploy.sh`:** Update the `QWEN_MODEL_NAME` env var to `Qwen/Qwen3.5-9B-Instruct`.
- **Update `.env.example` files:** Ensure both root and `/backend` examples reflect the new model ID.

### 4.3. Update Automation Workflows
- **Update `.github/workflows/health_analysis.yml`:** Confirm that any hardcoded model references or GitHub Secrets logic (if applicable) are aligned with the new ID.
- **Update `vllm_deployment/scripts/analyze_health.py`:** Update the `model` parameter in the API request payload.

## 5. Verification Checklist
- [ ] `supercyan-qwen` Cloud Run service is redeployed successfully.
- [ ] Smoke Test: `curl` the `/v1/chat/completions` endpoint and verify the `model` field in the response matches `Qwen/Qwen3.5-9B-Instruct`.
- [ ] Health Analysis: Manually trigger the `analyze_health.py` script and confirm it can prompt the 9B model and receive a valid analysis.
- [ ] No `[MOCK CONTEXT]` fallback is triggered in the backend logs.

## 6. Reference Material
- **Rule 23:** `23-cloud-run-gpu-governance.md` (Governance for Cloud Run GPU)
- **Skill:** `vllm-deployment-optimizer` (Optimization flags for vLLM)
- **PRD Section 3.2:** AI Chat & RAG Memory requirements.

"I have updated the documentation to reflect this change. Mr. Red, you are cleared to begin the upgrade." — **Mr. Pink**
