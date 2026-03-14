# Implementation Plan: VOS-009 vLLM Deployment

Deploy the Qwen 3.5 27B model using the vLLM engine on Google Cloud Run with GPU acceleration and scale-to-zero capabilities.

## Proposed Changes

### AI Infrastructure (`/vllm_deployment`)

#### [NEW] [Dockerfile](file:///home/marco/Personal%20AI%20Assistant/vllm_deployment/Dockerfile)
Create a Dockerfile based on the official vLLM OpenAI image.
- Base: `vllm/vllm-openai:latest`
- Command: Serve the `Qwen/Qwen3.5-27B` model.
- Optimization: Set `--engine vllm` and appropriate flags for concurrent requests.

#### [NEW] [cloudbuild.yaml](file:///home/marco/Personal%20AI%20Assistant/vllm_deployment/cloudbuild.yaml)
Define the GCP Build pipeline to automate image building and pushing to Artifact Registry.
- Region: `europe-west1` (or as specified in `cloud_run_setup.md`).
- Repository: `vibeos/vllm-qwen`.

#### [NEW] [deploy.sh](file:///home/marco/Personal%20AI%20Assistant/vllm_deployment/deploy.sh)
A Bash script to orchestrate the Cloud Run deployment.
- Command: `gcloud run deploy vibeos-qwen`
- Parameters:
    - `--gpu 1`
    - `--gpu-type nvidia-l4`
    - `--min-instances 0` (Rule 32 Compliance)
    - `--max-instances 1`
    - `--memory 32Gi`
    - `--cpu 8`
    - `--no-allow-unauthenticated` (Security enforcement)

## Verification Plan

### Automated Tests (Sanity Check)
1. **Local Build Check:** Run `docker build` check to ensure the Dockerfile is valid.
2. **Endpoint Verification:** After deployment, use a scratch script to ping the AI service:
   - `GET /health`: Verify readiness.
   - `POST /v1/chat/completions`: Verify OpenAI-compatible response.

### Manual Verification
1. **GCP Console Check:** Verify the service scales to zero after a period of inactivity.
2. **Log Audit:** Check Cloud Run logs for successful model loading and GPU initialization.
3. **Budget Verification:** Confirm through the console that no unexpected costs are incurred during idle periods.
