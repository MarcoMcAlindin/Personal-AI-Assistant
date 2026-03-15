# Rule 23: Cloud Run GPU Governance

## Context
Deploying LLMs (like Qwen 3.5) on Google Cloud Run requires specific optimizations to handle cold starts, high costs, and hardware-specific constraints (Nvidia L4 GPUs).

## Mandatory Constraints
1. **Red Agents (Infrastructure)**:
    - MUST use 4-bit quantization (AWQ/GPTQ) for any model > 7B parameters.
    - MUST enable prefix-caching if the serving framework supports it.
    - MUST set `min-instances=0` for dev/staging environments unless explicitly overridden by the CEO.
    - MUST configure `startupProbes` with an `initialDelaySeconds` >= 60 to accommodate model loading from Artifact Registry.

2. **Resource Allocation**:
    - AI services MUST use instance-based billing.
    - Any GPU service MUST be deployed with `Direct VPC` and `egress=all-traffic` if it mounts external storage for model weights.

3. **Concurrency**:
    - Developers MUST set the Cloud Run `concurrency` setting based on the formula: `(Total Parallel Slots per GPU) + (Batch Buffer)`.
    - Do NOT leave concurrency at the default (80) for AI services; it will cause OOM or extreme latency.

## Verification Protocol
- Any PR altering `vllm_deployment/` must be audited for "Quantization Drift" (accidentally reverting to FP16/BF16).
- Verification agents MUST check that the `max-model-len` in the deployment command is optimized for the allocated VRAM.
