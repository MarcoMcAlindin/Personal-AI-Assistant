---
name: gce-spot-gpu-manager
description: Manages high-precision multi-GPU deployments on Compute Engine with spot-cost optimization.
---
# GCE Spot GPU Manager

## When to use this skill
- When deploying models that exceed 24GB VRAM (e.g., 8-bit **Qwen/Qwen3.5-27B**).
- When a dedicated VS/Server environment is required instead of Cloud Run.

## How to use it

### 1. Pre-Flight Quota Check
Ensure you have the following quotas increased in your target region (e.g., `us-central1`):
- **NVIDIA L4 GPUs**: 2
- **Preemptible NVIDIA L4 GPUs**: 2 (if using Spot)

### 2. High-Precision Launch Command
Use the refined G2-Standard template:
```bash
gcloud compute instances create [INSTANCE_NAME] \
    --project=[PROJECT_ID] \
    --zone=[ZONE] \
    --machine-type=g2-standard-24 \
    --provisioning-model=SPOT \
    --instance-termination-action=STOP \
    --create-disk=size=100,type=pd-balanced,image-family=pytorch-latest-gpu,image-project=deeplearning-platform-release \
    --metadata=install-nvidia-driver=True
```

### 3. Multi-GPU Model Loading (Python)
Ensure `device_map="auto"` is used to prevent fragmentation:
```python
model_id = "Qwen/Qwen3.5-27B"
model = AutoModelForCausalLM.from_pretrained(
    model_id,
    load_in_8bit=True,
    device_map="auto",
    torch_dtype=torch.float16
)
```

### 4. Cost Protection (The "Kill Switch")
Always configure an auto-stop script or a cron job to check for GPU idleness and shut down the instance:
```bash
# Example idle check (pseudo-code)
if [ $(nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits | awk '{s+=$1} END {print s}') -eq 0 ]; then
  sudo shutdown -h now
fi
```
