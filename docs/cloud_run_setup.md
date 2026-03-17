# VibeOS - Cloud Run Deployment Guide

## 1. Prerequisites

- Google Cloud SDK installed (`gcloud`)
- Docker installed
- GCP project with billing enabled
- Artifact Registry enabled

```bash
# Authenticate
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

## 2. Deploy FastAPI Gateway

### Build & Push Container

```bash
cd backend

# Build the Docker image
docker build -t vibeos-gateway .

# Tag for Artifact Registry
docker tag vibeos-gateway \
  REGION-docker.pkg.dev/PROJECT_ID/vibeos/gateway:latest

# Push to Artifact Registry
docker push \
  REGION-docker.pkg.dev/PROJECT_ID/vibeos/gateway:latest
```

### Deploy to Cloud Run

```bash
gcloud run deploy vibeos-gateway \
  --image REGION-docker.pkg.dev/PROJECT_ID/vibeos/gateway:latest \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars "SUPABASE_URL=...,SUPABASE_SERVICE_ROLE_KEY=..." \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3
```

### Using MCP Tool

```
# Deploy directly using MCP
mcp_cloudrun_deploy_local_folder (project, folderPath: "/path/to/backend")

# Or deploy a container image
mcp_cloudrun_deploy_container_image (project, imageUrl, service: "vibeos-gateway")
```

## 3. Deploy Qwen3.5-9B-Instruct vLLM Container (GPU)

> **Note:** Requires GPU quota approval in your GCP project.

```bash
gcloud run deploy vibeos-qwen \
  --image vllm/vllm-openai:latest \
  --region europe-west1 \
  --no-allow-unauthenticated \
  --set-env-vars "MODEL_NAME=Qwen/Qwen3.5-9B-Instruct" \
  --memory 32Gi \
  --cpu 8 \
  --gpu 1 \
  --gpu-type nvidia-l4 \
  --min-instances 0 \
  --max-instances 1
```

## 4. Monitoring & Logs

```bash
# View logs
gcloud run services logs read vibeos-gateway --region europe-west1

# Or use MCP
mcp_cloudrun_get_service_log (project, service: "vibeos-gateway")
```

## 5. Environment Variables

Set secrets via Cloud Run console or CLI:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `QWEN_ENDPOINT_URL`
- `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` / `GMAIL_REFRESH_TOKEN`
- `TICKETMASTER_API_KEY`
