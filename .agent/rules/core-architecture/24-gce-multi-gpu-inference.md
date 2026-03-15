# Rule 24: GCE Multi-GPU Inference Governance

## Context
For high-precision models (e.g., **Qwen/Qwen3.5-27B** in 8-bit), multi-GPU Compute Engine (GCE) instances are required to meet VRAM demands (48GB+).

## Mandatory Constraints
1. **Mr. Red (Infrastructure)**:
    - MUST verify region quota (NVIDIA L4 GPUs >= 2) before initiating deployment.
    - MUST use **Spot Instances** (`--provisioning-model=SPOT`) for dev/test to maintain cost efficiency ($0.80/hr vs $2.00/hr).
    - MUST use `g2-standard-24` as the default machine type for 2x L4 deployments.
    - MUST include `--metadata=install-nvidia-driver=True" in the creation command to ensure CUDA readiness.

2. **Resource Management**:
    - Instances MUST be created with `--instance-termination-action=STOP` to preserve the boot disk and configuration during spot preemption.
    - Deployment scripts MUST use `pd-balanced` disks with at least 100GB to accommodate large model weights (~29GB for 8-bit).

3. **Inference Logic**:
    - Python inference code MUST utilize `device_map="auto"` from the `transformers` or `accelerate` library to automatically orchestrate the weight split across multiple GPUs.
    - Precision MUST be set to `load_in_8bit=True` with `torch_dtype=torch.float16` to ensure the 29GB model fits within the 39GB functional VRAM window.

## Verification Protocol
- Any new GCE deployment script must be checked for the "GCE Surprise Bill Protector" (auto-shutdown logic).
- Mr. Red must verify the "Buffer Zone": Ensure at least 5-10GB of VRAM remains free after weights are loaded to accommodate KV Cache during high-context conversations.
