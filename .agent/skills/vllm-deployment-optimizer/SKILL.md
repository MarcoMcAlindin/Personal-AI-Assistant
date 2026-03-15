---
name: vllm-deployment-optimizer
description: Maximizes Google Cloud Run efficiency and prevents idle GPU charges using official best practices.
---
# vLLM Deployment Optimizer

## When to use this skill
- When updating the `Dockerfile` or `cloudbuild.yaml` for the AI inference container.
- When configuring Cloud Run environment variables for LLM serving frameworks (vLLM, Ollama, etc.).

## How to use it

### 1. Build-Time Optimization
- **Quantization:** Prefer 4-bit (AWQ/GPTQ) for L4 GPUs to maximize parallelism and reduce startup latency.
- **Base Images:** Use `gcr.io/deeplearning-platform-release/gcs-fuse` or official NVIDIA NGC images.
- **Cache Warming:** Warm the prefix cache during the build process to speed up inference for static system prompts.

### 2. Deployment Architecture
- **Direct VPC:** Always use Direct VPC with `egress=all-traffic` when loading models from Cloud Storage or the internet for maximum bandwidth.
- **Scale-to-Zero:** Strictly enforce `min-instances=0` unless high cold-start latency (1-2 mins) is unacceptable for that specific service.
- **Startup Probes:** Set `initialDelaySeconds` to at least 60s for LLM containers to avoid premature health check failures during model loading.

### 3. Concurrency & Performance
- **Tuned Concurrency:** Use the formula `(Models * Parallel/Model) + (Models * Ideal Batch Size)` as a baseline.
- **Context Length:** Actively limit the `max-model-len` to the smallest acceptable window to increase the number of parallel requests handled per GPU.
- **Instance-Based Billing:** Ensure `instance-based-billing` is enabled (required for GPU).

### 4. Code Constraints
- **FP8 Inference:** Enable FP8 quantization for models running on Nvidia L4 GPUs to leverage hardware acceleration.
- **OOM Prevention:** Set `gpu-memory-utilization` high (0.90+) but monitor for shared memory overhead.
