#!/bin/bash
set -e

# Resolve gcloud -- prefer PATH, fall back to bundled SDK in repo root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
if ! command -v gcloud &>/dev/null; then
  export PATH="$REPO_ROOT/google-cloud-sdk/bin:$PATH"
fi

# Configuration
# Rule 24: Qwen3.5-27B 8-bit requires 2x L4 (48GB VRAM). Cloud Run max is 1 GPU.
# Deployment target: GCE g2-standard-24 Spot instance (2x L4, europe-west1-b).
PROJECT_ID=$(gcloud config get-value project)
REGION="europe-west1"
ZONE="europe-west1-b"
INSTANCE_NAME="vibeos-qwen-gpu"
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

# 2. Build and push container image via Cloud Build
echo "Building and pushing image via Cloud Build..."
gcloud builds submit --config cloudbuild.yaml .

# 3. Deploy to GCE Spot Instance (Rule 24: g2-standard-24 = 2x L4 = 48GB VRAM)
echo "Deploying to GCE Spot Instance ($INSTANCE_NAME, $ZONE)..."

if gcloud compute instances describe "$INSTANCE_NAME" --zone="$ZONE" --project="$PROJECT_ID" > /dev/null 2>&1; then
  # Instance exists -- restart it to pull the latest image via startup script
  echo "Instance exists. Resetting to pull latest image..."
  gcloud compute instances reset "$INSTANCE_NAME" \
    --zone="$ZONE" \
    --project="$PROJECT_ID"
else
  # Create new Spot instance (Rule 24 pattern)
  echo "Creating new GCE Spot instance..."
  gcloud compute instances create "$INSTANCE_NAME" \
    --project="$PROJECT_ID" \
    --zone="$ZONE" \
    --machine-type=g2-standard-24 \
    --provisioning-model=SPOT \
    --instance-termination-action=STOP \
    --create-disk=size=100,type=pd-balanced,image-family=pytorch-2-7-cu128-ubuntu-2204-nvidia-570,image-project=deeplearning-platform-release \
    --scopes=cloud-platform \
    --metadata-from-file=startup-script="$SCRIPT_DIR/scripts/startup.sh"
fi

echo "Deployment complete."
echo "Check instance status: gcloud compute instances describe $INSTANCE_NAME --zone $ZONE"
