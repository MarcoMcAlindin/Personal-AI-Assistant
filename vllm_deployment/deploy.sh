#!/bin/bash
set -e

# Configuration
PROJECT_ID=$(gcloud config get-value project)
REGION="europe-west1"
SERVICE_NAME="vibeos-qwen"
IMAGE_NAME="$REGION-docker.pkg.dev/$PROJECT_ID/vibeos/vllm-qwen:latest"

echo "🚀 Starting vLLM Deployment for Project: $PROJECT_ID"

# 1. Create Repository if it doesn't exist
if ! gcloud artifacts repositories describe vibeos --location=$REGION > /dev/null 2>&1; then
  echo "📦 Creating Artifact Registry repository..."
  gcloud artifacts repositories create vibeos \
    --repository-format=docker \
    --location=$REGION \
    --description="VibeOS Containerized Services"
fi

# 2. Trigger Cloud Build
echo "🛠 Building and pushing image via Cloud Build..."
gcloud builds submit --config cloudbuild.yaml .

echo "✅ Deployment triggered successfully."
echo "🔗 Check service status with: gcloud run services describe $SERVICE_NAME --region $REGION"
