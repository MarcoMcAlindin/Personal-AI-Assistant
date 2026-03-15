#!/bin/bash
set -e

# VibeOS Cloud Run Deployment Script
# Deploys the FastAPI gateway to Cloud Run (europe-west1)
#
# Prerequisites:
#   - backend/.env must exist with all required variables
#   - gcloud auth configured with correct project

PROJECT_ID=$(gcloud config get-value project)
SERVICE_NAME="vibeos-backend"
REGION="europe-west1"
IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/vibeos/$SERVICE_NAME:latest"

# Load .env file if it exists (for passing secrets to Cloud Run)
ENV_FILE="$(dirname "$0")/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: backend/.env not found. Copy .env.example and fill in values."
  exit 1
fi

# Build env vars string from .env (skip comments and empty lines)
ENV_VARS=$(grep -v '^#' "$ENV_FILE" | grep -v '^\s*$' | tr '\n' ',' | sed 's/,$//')

# Add CORS and Qwen config
# Mobile (React Native fetch) bypasses CORS; web needs explicit origins.
# Expo tunnel URLs are dynamic — add them to CORS_ORIGINS when known.
ENV_VARS="$ENV_VARS,CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8081"
ENV_VARS="$ENV_VARS,QWEN_ENDPOINT_URL=https://vibeos-qwen-599152061719.europe-west1.run.app/v1"
ENV_VARS="$ENV_VARS,QWEN_MODEL_NAME=RedHatAI/Qwen2.5-VL-7B-Instruct-quantized.w8a8"

echo "Deploying VibeOS Backend to Cloud Run ($REGION)..."

# 1. Create Artifact Registry repo if needed
if ! gcloud artifacts repositories describe vibeos --location=$REGION > /dev/null 2>&1; then
  echo "Creating Artifact Registry repository..."
  gcloud artifacts repositories create vibeos \
    --repository-format=docker \
    --location=$REGION \
    --description="VibeOS Containerized Services"
fi

# 2. Build and push
echo "Building container..."
gcloud builds submit --tag "$IMAGE" .

# 3. Deploy to Cloud Run
# --allow-unauthenticated: mobile/web clients call this directly
# --min-instances 0: scale-to-zero (Rule 08)
echo "Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE" \
  --region "$REGION" \
  --platform managed \
  --min-instances 0 \
  --max-instances 3 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --port 8080 \
  --allow-unauthenticated \
  --set-env-vars "$ENV_VARS"

SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format="value(status.url)")
echo ""
echo "Deployment complete!"
echo "Service URL: $SERVICE_URL"
echo ""
echo "Next: Set CLOUD_GATEWAY_URL=$SERVICE_URL in mobile/.env"
