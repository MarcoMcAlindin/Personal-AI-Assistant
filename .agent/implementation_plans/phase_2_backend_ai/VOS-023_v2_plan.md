---
description: Implementation blueprint for deploying Qwen2.5-VL-7B-Instruct on Cloud Run (VOS-023 v2 — model downgrade from 27B to 7B).
---

# Implementation Plan: VOS-023 v2 — Deploy Qwen2.5-VL-7B-Instruct to Cloud Run

- **Date:** 2026-03-15
- **Drafted By:** Mr. Pink (Architectural Scout)
- **Assigned To:** Mr. Red (Cloud Intelligence & Automation Ops)
- **Priority:** 🔴 CRITICAL — AI chat and health analysis are non-functional without this.
- **Branch:** `feature/red/23-vllm-qwen25vl`

---

## Context & Model Change

**What changed:** The CEO has directed a model switch due to GPU quota constraints:
- **Old:** Qwen 3.5 27B — required 2x L4 GPUs (48GB VRAM) on GCE Spot
- **New:** Qwen2.5-VL-7B-Instruct — fits on 1x L4 GPU (24GB VRAM) on Cloud Run

**What this means:**
- Cloud Run with scale-to-zero is viable again (no GCE VM management)
- No tensor parallelism needed (single GPU)
- The model is a **vision-language** model — it can process images and video in addition to text
- Cold starts drop from ~60-90s (27B on GCE) to ~15-30s (7B on Cloud Run)

**Previous work on VOS-023 is SUPERSEDED.** The Dockerfile, deploy.sh, startup.sh, and service.yaml changes made for the 27B GCE deployment must be replaced, not amended.

---

## Mandatory Reading Before Starting

1. **Rule 23** (`23-cloud-run-gpu-governance.md`) — Rewritten for the 7B model. Contains the full vLLM serve command, VRAM budget, and verification checklist.
2. **Rule 08** (`08-gc-scale-to-zero.md`) — Scale-to-zero mandate.
3. **Rule 24** (`24-gce-multi-gpu-inference.md`) — Read the DEPRECATED notice so you understand GCE is no longer the target.
4. **Skill: `vllm-deployment-optimizer`** — Contains the exact Dockerfile CMD, Cloud Run YAML, and forbidden patterns. Follow it exactly.

---

## Step-by-Step Implementation

### Step 1 — Rewrite `vllm_deployment/Dockerfile`

Replace the entire Dockerfile with:

```dockerfile
# Qwen2.5-VL-7B-Instruct on vLLM (Cloud Run, single L4 GPU)
FROM vllm/vllm-openai:latest

ENV MODEL_NAME="RedHatAI/Qwen2.5-VL-7B-Instruct-quantized.w8a8"

# Port 8080 is the Cloud Run standard
ENTRYPOINT ["python3", "-m", "vllm.entrypoints.openai.api_server"]
CMD ["--model", "RedHatAI/Qwen2.5-VL-7B-Instruct-quantized.w8a8", \
     "--port", "8080", \
     "--trust-remote-code", \
     "--enforce-eager", \
     "--max-model-len", "8192", \
     "--gpu-memory-utilization", "0.90", \
     "--max-num-seqs", "16", \
     "--limit-mm-per-prompt", "{\"image\":2,\"video\":0}"]
```

**Key flags explained:**
- `--enforce-eager` — **REQUIRED for VL models.** Prevents CUDA graph crashes with the vision encoder.
- `--limit-mm-per-prompt` — Caps image inputs to 2 per request, prevents OOM from large visual token counts.
- No `--tensor-parallel-size` — single GPU.
- No `--quantization` flag — the W8A8 model has quantization embedded in the weights.
- No `--dtype` flag — W8A8 handles this internally.

---

### Step 2 — Rewrite `vllm_deployment/deploy.sh`

Revert to Cloud Run deployment (remove all GCE logic):

```bash
#!/bin/bash
set -e

# Resolve gcloud
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
if ! command -v gcloud &>/dev/null; then
  export PATH="$REPO_ROOT/google-cloud-sdk/bin:$PATH"
fi

# Configuration
PROJECT_ID=$(gcloud config get-value project)
REGION="europe-west1"
SERVICE_NAME="vibeos-qwen"
IMAGE_NAME="$REGION-docker.pkg.dev/$PROJECT_ID/vibeos/vllm-qwen:latest"

echo "Starting vLLM Deployment for Project: $PROJECT_ID"

# 1. Create Artifact Registry repository if needed
if ! gcloud artifacts repositories describe vibeos --location=$REGION > /dev/null 2>&1; then
  echo "Creating Artifact Registry repository..."
  gcloud artifacts repositories create vibeos \
    --repository-format=docker \
    --location=$REGION \
    --description="VibeOS Containerized Services"
fi

# 2. Build and push via Cloud Build
echo "Building and pushing image via Cloud Build..."
gcloud builds submit --config cloudbuild.yaml .

# 3. Deploy to Cloud Run with single L4 GPU
echo "Deploying to Cloud Run ($SERVICE_NAME, $REGION)..."
gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE_NAME" \
  --region "$REGION" \
  --platform managed \
  --gpu 1 \
  --gpu-type nvidia-l4 \
  --memory 16Gi \
  --cpu 4 \
  --max-instances 1 \
  --min-instances 0 \
  --timeout 300 \
  --concurrency 16 \
  --port 8080 \
  --no-allow-unauthenticated \
  --set-env-vars "MODEL_NAME=RedHatAI/Qwen2.5-VL-7B-Instruct-quantized.w8a8"

echo "Deployment complete."
echo "Check service: gcloud run services describe $SERVICE_NAME --region $REGION"
```

---

### Step 3 — Rewrite `vllm_deployment/cloudbuild.yaml`

Simplify back to a standard Cloud Build config:

```yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', '${_REGION}-docker.pkg.dev/$PROJECT_ID/vibeos/vllm-qwen:latest', '.']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', '${_REGION}-docker.pkg.dev/$PROJECT_ID/vibeos/vllm-qwen:latest']

substitutions:
  _REGION: europe-west1

images:
  - '${_REGION}-docker.pkg.dev/$PROJECT_ID/vibeos/vllm-qwen:latest'
```

---

### Step 4 — Rewrite `vllm_deployment/service.yaml`

Update the Cloud Run service config for the new model:

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: vibeos-qwen
  annotations:
    run.googleapis.com/launch-stage: GA
    run.googleapis.com/ingress: all
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "0"
        autoscaling.knative.dev/maxScale: "1"
        run.googleapis.com/startup-cpu-boost: "true"
    spec:
      containerConcurrency: 16
      timeoutSeconds: 300
      containers:
        - image: europe-west1-docker.pkg.dev/PROJECT_ID/vibeos/vllm-qwen:latest
          ports:
            - containerPort: 8080
          env:
            - name: MODEL_NAME
              value: "RedHatAI/Qwen2.5-VL-7B-Instruct-quantized.w8a8"
          resources:
            limits:
              nvidia.com/gpu: "1"
              memory: "16Gi"
              cpu: "4"
      nodeSelector:
        run.googleapis.com/accelerator: nvidia-l4
```

---

### Step 5 — Delete `vllm_deployment/scripts/startup.sh`

This file was the GCE instance startup script. It is no longer needed since we are deploying to Cloud Run, not GCE. **Delete it.**

---

### Step 6 — Update `vllm_deployment/scripts/analyze_health.py`

Update the model name in the API call (line 69):

```python
# OLD:
"model": "Qwen/Qwen3.5-27B",

# NEW:
"model": "RedHatAI/Qwen2.5-VL-7B-Instruct-quantized.w8a8",
```

Keep all the other changes from the previous iteration:
- GCP identity token auth (correct for authenticated Cloud Run)
- 300s timeout (still appropriate — cold start is faster but we keep the buffer)
- `sys.exit(1)` on no metrics (correct)

---

### Step 7 — Update `vllm_deployment/README.md`

Replace references to "Qwen 3.5 27B" with "Qwen2.5-VL-7B-Instruct".

---

### Step 8 — Update `.github/workflows/daily_health.yml`

Keep the GCP Auth and gcloud setup steps (they are correct for calling an authenticated Cloud Run service). No changes needed beyond what was already added.

---

### Step 9 — Update Environment Variables

In `backend/.env.example` and root `.env.example`:

```
# OLD:
QWEN_MODEL_NAME=Qwen/Qwen3.5-27B

# NEW:
QWEN_MODEL_NAME=RedHatAI/Qwen2.5-VL-7B-Instruct-quantized.w8a8
```

---

### Step 10 — Update `backend/app/api/v1/endpoints.py`

Update the model name in the chat endpoint (line 69):

```python
# OLD:
"model": "Qwen/Qwen3.5-27B",

# NEW:
"model": "RedHatAI/Qwen2.5-VL-7B-Instruct-quantized.w8a8",
```

**Boundary note:** This is a Mr. Green file. Coordinate with Green or submit the change as a cross-boundary patch documented in the handoff. Mr. Pink authorises this specific edit.

---

## Files to Create / Modify / Delete

| Action | File |
|---|---|
| REWRITE | `vllm_deployment/Dockerfile` |
| REWRITE | `vllm_deployment/deploy.sh` |
| REWRITE | `vllm_deployment/cloudbuild.yaml` |
| REWRITE | `vllm_deployment/service.yaml` |
| **DELETE** | `vllm_deployment/scripts/startup.sh` |
| MODIFY | `vllm_deployment/scripts/analyze_health.py` (model name only) |
| MODIFY | `vllm_deployment/README.md` (model name only) |
| MODIFY | `backend/.env.example` (model name) |
| MODIFY | `.env.example` (model name) |
| MODIFY | `backend/app/api/v1/endpoints.py` (model name — cross-boundary, authorised) |

---

## Definition of Done (Pink Verification Checklist)

- [ ] Dockerfile uses `RedHatAI/Qwen2.5-VL-7B-Instruct-quantized.w8a8`
- [ ] Dockerfile includes `--enforce-eager` and `--limit-mm-per-prompt`
- [ ] Dockerfile does NOT contain `--tensor-parallel-size`
- [ ] `deploy.sh` targets Cloud Run (NOT GCE)
- [ ] `deploy.sh` sets `--gpu 1 --gpu-type nvidia-l4 --min-instances 0`
- [ ] `startup.sh` is DELETED
- [ ] `analyze_health.py` model name updated
- [ ] `endpoints.py` model name updated
- [ ] `.env.example` files updated
- [ ] `grep -r "Qwen3.5\|Qwen/Qwen3.5-27B\|g2-standard-24\|tensor-parallel" vllm_deployment/` returns empty
- [ ] Branch `feature/red/23-vllm-qwen25vl` pushed to origin with handoff

*Drafted by Mr. Pink — 2026-03-15*
