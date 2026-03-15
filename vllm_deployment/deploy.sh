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
SERVICE_NAME="vibeos-qwen"
IMAGE_NAME="$REGION-docker.pkg.dev/$PROJECT_ID/vibeos/vllm-qwen:latest"

echo "Starting vLLM Deployment for Project: $PROJECT_ID"

# 1. Create Artifact Registry repository if it doesn't exist
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

# 3. Deploy to Cloud Run with single L4 GPU (Rule 23)
# --gpu 1 --gpu-type nvidia-l4: single L4, 24GB VRAM
# --min-instances 0: scale-to-zero (Rule 08)
# --concurrency 16: matches --max-num-seqs in vLLM CMD
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
  --timeout 300 \
  --concurrency 16 \
  --port 8080 \
  --no-allow-unauthenticated \
  --set-env-vars "MODEL_NAME=RedHatAI/Qwen2.5-VL-7B-Instruct-quantized.w8a8"

echo "Deployment complete."
echo "Check service: gcloud run services describe $SERVICE_NAME --region $REGION"
