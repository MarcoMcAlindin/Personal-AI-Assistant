# SENDOFF: VOS-049 — Cloud Run Egress & NAT Optimization

## 1. Objective
A recent cost audit revealed that our vLLM Cloud Run service is routing all traffic, including massive model downloads, through a Cloud NAT gateway, incurring high data processing fees ($0.045/GB). Mr. Red is tasked with executing a series of infrastructure optimizations to drop this cost.

## 2. Technical Domain: Mr. Red (Cloud Intelligence & Automation Ops)
**Codebase Territory:** `/vllm_deployment`, `deploy.sh`, `service.yaml`, and GCP configuration scripts.

## 3. Implementation Steps

1. **Update Egress Setting (`vllm_deployment/service.yaml`):** 
   Change `run.googleapis.com/vpc-access-egress` from `all-traffic` to `private-ranges-only`. This ensures public internet traffic bypasses the NAT.

2. **Cache Model in Docker Image (`vllm_deployment/Dockerfile`):** 
   Add a build step to download `Qwen/Qwen3.5-9B-Instruct` directly into the Docker image so it is not re-downloaded on every scale-to-zero cold start.
   ```dockerfile
   RUN python -c "from huggingface_hub import snapshot_download; snapshot_download('Qwen/Qwen3.5-9B-Instruct')"
   ```

3. **Fix Resource Mismatches:** 
   Update `vllm_deployment/service.yaml` and `vllm_deployment/deploy.sh` to explicitly request 4 CPUs, 16Gi Memory, and a 300s timeout (sufficient for the 9B model).

4. **Private Google Access:**
   Provide a command or script to enable Private Google Access (PGA) on the default subnet in `europe-west1` to route Google internal traffic over the free backbone.

## 4. Verification Checklist
- [ ] Docker image builds successfully and caches the model weights.
- [ ] Cloud Run service deploys successfully with `private-ranges-only` egress.
- [ ] Cold starts do not trigger massive network egress spikes.
