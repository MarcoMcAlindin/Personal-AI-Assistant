#!/bin/bash
set -e

# Resolve gcloud -- prefer PATH, fall back to bundled SDK in repo root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
if ! command -v gcloud &>/dev/null; then
  export PATH="$REPO_ROOT/google-cloud-sdk/bin:$PATH"
fi

# Configuration
# Rule 23: Single L4 GPU on Cloud Run (scale-to-zero). Rule 24 (GCE) is deprecated.
PROJECT_ID=$(gcloud config get-value project)
REGION="europe-west1"
SERVICE_NAME="supercyan-qwen"
IMAGE_NAME="$REGION-docker.pkg.dev/$PROJECT_ID/supercyan/vllm-qwen:latest"

echo "Starting vLLM Deployment for Project: $PROJECT_ID"

# 1. Create Artifact Registry repository if it doesn't exist
if ! gcloud artifacts repositories describe supercyan --location=$REGION > /dev/null 2>&1; then
  echo "Creating Artifact Registry repository..."
  gcloud artifacts repositories create supercyan \
    --repository-format=docker \
    --location=$REGION \
    --description="SuperCyan Containerized Services"
fi

# 2. Build and push via Cloud Build
echo "Building and pushing image via Cloud Build..."
cd "$SCRIPT_DIR"
gcloud builds submit --config cloudbuild.yaml .

# 3. Deploy to Cloud Run with single L4 GPU (Rule 23)
# --gpu 1 --gpu-type nvidia-l4: single L4, 24GB VRAM -- GGUF Q4_K_M ~19.5GB + ~4.5GB KV cache headroom
# --min-instances 0: scale-to-zero (Rule 08)
# --concurrency 16: matches --parallel in CMD
# --no-allow-unauthenticated: IAM-protected, called via identity token
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
  --timeout 600 \
  --concurrency 16 \
  --port 8080 \
  --no-allow-unauthenticated \
  --set-env-vars "MODEL_NAME=unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF"

echo "Deployment complete."
echo "Check service: gcloud run services describe $SERVICE_NAME --region $REGION"
