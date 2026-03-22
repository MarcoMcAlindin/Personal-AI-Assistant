#!/bin/bash
set -e

# SuperCyan Cloud Run Deployment Script
# Deploys the FastAPI gateway to Cloud Run (europe-west1)
#
# Prerequisites:
#   - backend/.env must exist with all required variables
#   - gcloud auth configured with correct project

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

# Resolve gcloud
if ! command -v gcloud &>/dev/null; then
  export PATH="$REPO_ROOT/google-cloud-sdk/bin:$PATH"
fi

PROJECT_ID=$(gcloud config get-value project)
SERVICE_NAME="supercyan-backend"
REGION="europe-west1"
IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/supercyan/$SERVICE_NAME:latest"

# Load .env file if it exists
ENV_FILE="$SCRIPT_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: backend/.env not found. Copy .env.example and fill in values."
  exit 1
fi

# Build env-vars-file for Cloud Run (YAML format)
# .env values first, then deployment overrides (last write wins)
ENV_YAML=$(mktemp)
grep -v '^#' "$ENV_FILE" | grep -v '^\s*$' | while read -r line; do
  key="${line%%=*}"
  value="${line#*=}"
  # Strip surrounding quotes from .env values
  value=$(echo "$value" | sed 's/^["'\'']\(.*\)["'\'']$/\1/')
  echo "$key: '$value'" >> "$ENV_YAML"
done

# Override with deployment-specific values (these take precedence over .env)
# Using sed to replace existing keys or append if missing
for pair in \
  "CORS_ORIGINS:http://localhost:3000,http://localhost:5173,http://localhost:8081" \
  "QWEN_ENDPOINT_URL:https://supercyan-qwen-599152061719.europe-west1.run.app/v1" \
  "QWEN_MODEL_NAME:unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF" \
  "GOOGLE_REDIRECT_URI:https://supercyan-backend-enffsru5pa-ew.a.run.app/api/v1/auth/google/callback" \
  "FRONTEND_URL:http://localhost:3000"; do
  key="${pair%%:*}"
  val="${pair#*:}"
  if grep -q "^$key:" "$ENV_YAML"; then
    sed -i "s|^$key:.*|$key: '$val'|" "$ENV_YAML"
  else
    echo "$key: '$val'" >> "$ENV_YAML"
  fi
done

echo "Deploying SuperCyan Backend to Cloud Run ($REGION)..."

# 1. Create Artifact Registry repo if needed
if ! gcloud artifacts repositories describe supercyan --location=$REGION > /dev/null 2>&1; then
  echo "Creating Artifact Registry repository..."
  gcloud artifacts repositories create supercyan \
    --repository-format=docker \
    --location=$REGION \
    --description="SuperCyan Containerized Services"
fi

# 2. Build and push
echo "Building container..."
gcloud builds submit --tag "$IMAGE" "$SCRIPT_DIR"

# 3. Deploy to Cloud Run
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
  --env-vars-file "$ENV_YAML"

rm -f "$ENV_YAML"

SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format="value(status.url)")
echo ""
echo "Deployment complete!"
echo "Service URL: $SERVICE_URL"
echo ""
echo "Next: Set CLOUD_GATEWAY_URL=$SERVICE_URL in mobile/.env"
