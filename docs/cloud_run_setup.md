# SuperCyan - Cloud Run Deployment Guide

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
docker build -t supercyan-gateway .

# Tag for Artifact Registry
docker tag supercyan-gateway \
  REGION-docker.pkg.dev/PROJECT_ID/supercyan/gateway:latest

# Push to Artifact Registry
docker push \
  REGION-docker.pkg.dev/PROJECT_ID/supercyan/gateway:latest
```

### Deploy to Cloud Run

```bash
gcloud run deploy supercyan-gateway \
  --image REGION-docker.pkg.dev/PROJECT_ID/supercyan/gateway:latest \
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
mcp_cloudrun_deploy_container_image (project, imageUrl, service: "supercyan-gateway")
```

## 3. Deploy Qwen3-Coder-30B-Instruct vLLM Container (GPU)

> **Note:** Requires GPU quota approval in your GCP project.

```bash
gcloud run deploy supercyan-qwen \
  --image vllm/vllm-openai:latest \
  --region europe-west1 \
  --no-allow-unauthenticated \
  --set-env-vars "MODEL_NAME=unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF" \
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
gcloud run services logs read supercyan-gateway --region europe-west1

# Or use MCP
mcp_cloudrun_get_service_log (project, service: "supercyan-gateway")
```

## 5. Environment Variables

Set secrets via Cloud Run console or CLI:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `QWEN_ENDPOINT_URL`
- `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` / `GMAIL_REFRESH_TOKEN`
- `TICKETMASTER_API_KEY`
