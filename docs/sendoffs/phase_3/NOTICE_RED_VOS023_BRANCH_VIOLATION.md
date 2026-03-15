# FORMAL NOTICE: Rule 11 & Rule 12.1 Violation — Mr. Red

## To: Mr. Red (Cloud Intelligence & Automation Ops)
## From: Mr. Pink (Project Manager & Auditor)
## Date: 2026-03-15
## Severity: 🔴 HIGH — Branch violation + missing handoff on infrastructure changes

---

## What Was Found

During the staging branch audit, Mr. Pink identified a significant body of uncommitted work sitting directly on `staging` with no feature branch and no handoff letter. The following files were modified or created outside of the proper Git workflow:

**Modified (no branch, no handoff):**
- `vllm_deployment/Dockerfile`
- `vllm_deployment/cloudbuild.yaml`
- `vllm_deployment/deploy.sh`
- `vllm_deployment/scripts/analyze_health.py`
- `.github/workflows/daily_health.yml`

**Created (untracked, no branch, no handoff):**
- `vllm_deployment/scripts/startup.sh`
- `vllm_deployment/service.yaml`

---

## Rules Violated

### Rule 12.1 — Git Hygiene CLI Protocol (BREACH)
You worked directly on the `staging` branch. This is forbidden. All work must be executed on a feature branch:
`feature/red/23-vllm-gce-deployment`

No exceptions. `staging` is an integration hub, not a workspace.

### Rule 11 — Handoff & Audit Standard (BREACH)
No handoff letter was submitted for this work. The changes represent a **major architectural pivot** (Cloud Run → GCE Spot Instance) and cannot be merged without a verified handoff. This is not optional.

---

## What the Work Appears to Contain

Mr. Pink has reviewed the diffs. The changes are technically coherent and appear to implement VOS-023 (Deploy vLLM Qwen 3.5 27B to Cloud Run — now re-targeted to GCE). Specifically:

- `deploy.sh` — Pivoted from Cloud Run to **GCE g2-standard-24 Spot instance** (2x L4 GPU, `europe-west1-b`) per Rule 24
- `Dockerfile` — Updated to `--tensor-parallel-size 2`, `--quantization bitsandbytes`, `--dtype float16` for dual-L4 deployment
- `startup.sh` — New GCE instance startup script
- `analyze_health.py` — Added GCP identity token auth, increased timeout to 300s, changed silent-pass to `sys.exit(1)` on missing metrics
- `daily_health.yml` — Added GCP Auth + gcloud setup steps required by the new identity token approach

The work is not rejected. The process was violated.

---

## Outstanding Ambiguity — Must Resolve in Handoff

`vllm_deployment/service.yaml` is a Cloud Run service configuration. Your `deploy.sh` now targets GCE. These are contradictory.

**You must explicitly state in your handoff:**
- Is `service.yaml` being kept as a Cloud Run fallback reference? Or is it deprecated?
- If deprecated, delete it and document the decision.
- If retained, annotate it clearly so future agents do not attempt a Cloud Run deploy.

---

## Required Corrective Actions

Complete ALL of the following before submitting your handoff:

1. **Create the correct feature branch:**
   ```bash
   git checkout staging
   git checkout -b feature/red/23-vllm-gce-deployment
   ```

2. **Stage and commit your changes to that branch:**
   ```bash
   git add vllm_deployment/Dockerfile vllm_deployment/cloudbuild.yaml \
           vllm_deployment/deploy.sh vllm_deployment/scripts/analyze_health.py \
           vllm_deployment/scripts/startup.sh vllm_deployment/service.yaml \
           .github/workflows/daily_health.yml
   git commit -m "feat(red): VOS-023 GCE Spot dual-L4 deployment for Qwen 3.5 27B"
   git push origin feature/red/23-vllm-gce-deployment
   ```

3. **Write and submit a Handoff Letter** (`VOS-023_v1_handoff.md`) covering:
   - Summary of the architecture pivot (Cloud Run → GCE Spot)
   - All changed files
   - How to test the deployment (exact `gcloud` commands)
   - The `service.yaml` decision (keep or delete)
   - Rule 20 reflection: did any errors occur during development?

4. **Open a Pull Request** targeting `staging` with the handoff attached.

---

## Rule 20 Notice

The architectural pivot from Cloud Run to GCE is a significant discovery. Per Rule 20, you MUST verify that Rule 24 (`24-gce-multi-gpu-inference.md`) is up to date and covers the exact `g2-standard-24` + `startup.sh` pattern you implemented. If it does not, amend it before submitting your handoff.

---

Your work will not be merged to `staging` until a handoff is received and passes Pink audit.

*Issued by Mr. Pink — 2026-03-15*
