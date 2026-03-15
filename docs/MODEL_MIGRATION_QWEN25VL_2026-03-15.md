# Model Migration: Qwen 3.5 27B → Qwen2.5-VL-7B-Instruct

**Date:** 2026-03-15
**Decision By:** CEO
**Executed By:** Mr. Pink (rules, skills, plans, board) + Mr. Red (implementation)

---

## Migration Summary

| Property | Old (Qwen 3.5 27B) | New (Qwen2.5-VL-7B-Instruct) |
|----------|---------------------|-------------------------------|
| HuggingFace Model ID | `Qwen/Qwen3.5-27B` | `Qwen/Qwen2.5-VL-7B-Instruct` |
| Production Model ID | N/A (never deployed) | `RedHatAI/Qwen2.5-VL-7B-Instruct-quantized.w8a8` |
| Parameters | 27B | 7B |
| Modality | Text only | Text + Image + Video |
| GPU Requirement | 2x NVIDIA L4 (48GB VRAM) | 1x NVIDIA L4 (24GB VRAM) |
| Deployment Platform | GCE Spot VM (g2-standard-24) | Cloud Run (scale-to-zero) |
| Quantization | BitsAndBytes INT8 | W8A8 pre-quantized (embedded in model) |
| Tensor Parallelism | `--tensor-parallel-size 2` | Not needed |
| Cold Start | ~60-90 seconds | ~15-30 seconds |
| `--enforce-eager` | Not set | **Required** (VL model stability) |
| `--limit-mm-per-prompt` | Not applicable | `{"image":2,"video":0}` |
| Minimum vLLM Version | N/A | v0.8.5+ |

## Reason for Change

GPU quota constraint: unable to obtain 2x NVIDIA L4 GPUs required for the 27B model in `europe-west1`.

## Governance Changes

| Item | Action |
|------|--------|
| Rule 24 (GCE Multi-GPU) | DEPRECATED |
| Rule 23 (Cloud Run GPU Governance) | REWRITTEN for 7B model |
| Rule 08 (Scale-to-Zero) | Updated cold start estimate |
| Rule 21 (AI Behavioral Consistency) | Updated model identity section |
| Skill: `vllm-deployment-optimizer` | REWRITTEN for Cloud Run + 7B |
| Skill: `gce-spot-gpu-manager` | DEPRECATED |
| Skill: `rag-context-manager` | Model name updated |
| Rule: `skill-compliance` | Deprecation notice for GCE skill |
| VOS-023 GitHub Issue (#27) | Title and body rewritten |
| VOS-024 GitHub Issue (#28) | Body updated with new model name |
| VOS-023 Implementation Plan | v2 created (`VOS-023_v2_plan.md`) |

## Files Requiring Model Name Updates (44 total)

Identified via full repository audit. Key categories:

**Code/Deployment (must change for system to function):**
- `vllm_deployment/Dockerfile`
- `vllm_deployment/deploy.sh`
- `vllm_deployment/cloudbuild.yaml`
- `vllm_deployment/service.yaml`
- `vllm_deployment/scripts/startup.sh` (DELETE)
- `vllm_deployment/scripts/analyze_health.py`
- `vllm_deployment/README.md`
- `backend/app/api/v1/endpoints.py`
- `backend/app/services/ai_service.py`
- `backend/.env.example`
- `.env.example`

**Documentation (update for accuracy):**
- `CLAUDE.md`
- `docs/PRD.md`
- `docs/Tech_spec.md`
- `docs/team.md`
- `docs/cloud_run_setup.md`
- `README.md`

**Historical records (do NOT modify — preserve audit trail):**
- Handoff letters (VOS-009 v1/v2, VOS-010, etc.)
- Approval sendoffs
- Audit reports

*Saved by Mr. Pink — 2026-03-15*
