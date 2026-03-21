# HANDOFF: VOS-049 — Cloud Run Egress & NAT Optimization

## 1. Objective
Optimize the vLLM Cloud Run infrastructure to reduce data processing costs by caching model weights in the Docker image, restricting VPC egress to private ranges, and enabling Private Google Access (PGA).

## 2. Changes Implemented

### 2.1. vLLM Deployment (`/vllm_deployment`)
- **`Dockerfile`**: 
    - Added `RUN python3 -m pip install huggingface_hub`
    - Added `RUN python3 -c "from huggingface_hub import snapshot_download; snapshot_download('Qwen/Qwen3.5-9B-Instruct')"` to bake the 9B model weights into the image.
    - Updated `MODEL_NAME` and `CMD` to point to `Qwen/Qwen3.5-9B-Instruct`.
- **`service.yaml`**: 
    - Updated `run.googleapis.com/vpc-access-egress` to `private-ranges-only` to bypass Cloud NAT for public traffic.
    - Adjusted resources: `cpu: "4"`, `memory: 16Gi`, `timeoutSeconds: 300`.
- **`deploy.sh`**: 
    - Synchronized `cpu`, `memory`, and `timeout` flags with `service.yaml`.
    - Updated `MODEL_NAME` environment variable.

### 2.2. Network Infrastructure
- **Private Google Access (PGA)**: Enabled PGA on the `default` subnet in `europe-west1` via CLI to allow the container to reach Google APIs (like Artifact Registry) without a NAT gateway.

## 3. Verification Protocol (For Mr. Pink)

### 3.1. Infrastructure Audit
1. Run `gcloud run services describe supercyan-qwen --region europe-west1`.
2. **Verify Egress**: Ensure `VPC Egress` is set to `private-ranges-only`.
3. **Verify Resources**: Confirm 4 CPUs and 16Gi RAM are allocated.

### 3.2. Networking Audit
1. Run `gcloud compute networks subnets describe default --region=europe-west1`.
2. **Verify PGA**: Ensure `privateIpGoogleAccess` is `true`.

### 3.3. Build Audit
1. Inspect the latest Cloud Build logs.
2. **Verify Caching**: Confirm the `snapshot_download` step executed successfully and the image size has increased to accommodate the ~18GB model weights.

## 4. Technical Debt / Notes
- The Docker image is now significantly larger (~20GB+). Ensure Artifact Registry storage limits are monitored, though this is significantly cheaper than NAT egress fees.
- Cold starts should now be faster as the model is read from local disk rather than downloaded over the network.

**Status:** Ready for Audit.
**Branch:** `feature/red/049-cost-optimization`
