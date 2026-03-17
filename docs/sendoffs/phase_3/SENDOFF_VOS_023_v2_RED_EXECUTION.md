# SENDOFF: VOS-023 v2 — Qwen3.5-9B-Instruct Deployment

## To: Mr. Red (Cloud Intelligence & Automation Ops)
## From: Mr. Pink (Project Manager & Architectural Scout)
## Date: 2026-03-15

---

### THE MODEL HAS CHANGED. READ EVERYTHING BEFORE YOU TOUCH A FILE.

Mr. Red, all previous VOS-023 work is **superseded**. The CEO has directed a model switch due to GPU quota constraints:

| | Old | New |
|--|-----|-----|
| Model | Qwen3.5-9B-Instruct | **Qwen3.5-9B-Instruct** |
| GPU | 2x L4 (GCE Spot) | **1x L4 (Cloud Run)** |
| Quantization | BitsAndBytes 8-bit | **W8A8 pre-quantized** |
| Scale-to-zero | No (GCE VM) | **Yes (Cloud Run)** |
| Tensor parallel | `--tensor-parallel-size 2` | **Not needed** |
| Cold start | ~60-90s | **~15-30s** |
| Bonus capability | Text only | **Text + Image + Video** |

---

### Your Mandatory Reading

Before writing a single line of code, read these four files in order:

1. `.agent/implementation_plans/phase_2_backend_ai/VOS-023_v2_plan.md` — Full step-by-step with exact file contents
2. `.agent/rules/core-architecture/23-cloud-run-gpu-governance.md` — Rewritten governance for the 9B model
3. `.agent/skills/vllm-deployment-optimizer/SKILL.md` — Rewritten skill with exact Dockerfile CMD and Cloud Run YAML
4. `.agent/rules/core-architecture/24-gce-multi-gpu-inference.md` — Read the DEPRECATED notice

### Your Mission

**Branch:** `feature/red/23-vllm-qwen25vl`

1. Rewrite the Dockerfile, deploy.sh, cloudbuild.yaml, and service.yaml for Cloud Run
2. DELETE startup.sh (GCE artifact, no longer needed)
3. Update model names in analyze_health.py and endpoints.py
4. Execute `bash deploy.sh` — actually deploy the container
5. Capture the live endpoint URL and set `QWEN_ENDPOINT_URL` as a GitHub Secret
6. Smoke test with a curl

### Your Previous Work

The uncommitted changes currently sitting on `staging` (Dockerfile, deploy.sh, etc.) are for the **9B GCE deployment and are now obsolete**. You must overwrite them completely per the v2 plan. The formal notice issued earlier (`NOTICE_RED_VOS023_BRANCH_VIOLATION.md`) is superseded by this sendoff — the process violation still stands as a governance lesson, but the corrective action is now to implement the v2 plan instead.

### What Mr. Pink Will Check During Audit

```bash
grep -r "Qwen3.5\|g2-standard-24\|tensor-parallel" vllm_deployment/
# Must return empty

ls vllm_deployment/scripts/startup.sh
# Must not exist

gcloud run services describe vibeos-qwen --region europe-west1
# Must show READY with nvidia-l4
```

---

**The AI layer is dead until this ships. Make it live. - Mr. Pink**
