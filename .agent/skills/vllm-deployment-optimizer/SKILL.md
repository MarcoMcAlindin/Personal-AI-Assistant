---
name: vllm-deployment-optimizer
description: Deploys Qwen3.5-9B-Instruct on Google Cloud Run with a single L4 GPU, scale-to-zero, and vision-language support.
---
# vLLM Deployment Optimizer — Qwen3.5-9B-Instruct

## When to use this skill
- When updating the `Dockerfile` or `cloudbuild.yaml` for the AI inference container.
- When configuring Cloud Run environment variables for the vLLM serving framework.
- When deploying or redeploying the Qwen3.5-9B-Instruct model.

## Model Details

| Property | Value |
|----------|-------|
| Production Model ID | `RedHatAI/Qwen3.5-9B-Instruct-quantized.w8a8` |
| Fallback Model ID | `Qwen/Qwen3.5-9B-Instruct` |
| Modality | Text + Image + Video |
| Minimum vLLM | `v0.8.5+` |
| GPU | 1x NVIDIA L4 (24GB) — Cloud Run |
| VRAM footprint (W8A8) | ~7-9 GB weights + ~4-6 GB KV cache |

## How to use it

### 1. Dockerfile CMD (Reference Implementation)

**Using the pre-quantized W8A8 model (preferred):**
```dockerfile
FROM vllm/vllm-openai:latest
ENV MODEL_NAME="RedHatAI/Qwen3.5-9B-Instruct-quantized.w8a8"
ENTRYPOINT ["python3", "-m", "vllm.entrypoints.openai.api_server"]
CMD ["--model", "RedHatAI/Qwen3.5-9B-Instruct-quantized.w8a8", \
     "--port", "8080", \
     "--trust-remote-code", \
     "--enforce-eager", \
     "--max-model-len", "8192", \
     "--gpu-memory-utilization", "0.90", \
     "--max-num-seqs", "16", \
     "--limit-mm-per-prompt", "{\"image\":2,\"video\":0}"]
```

**Using BitsAndBytes 8-bit fallback:**
```dockerfile
CMD ["--model", "Qwen/Qwen3.5-9B-Instruct", \
     "--port", "8080", \
     "--trust-remote-code", \
     "--enforce-eager", \
     "--quantization", "bitsandbytes", \
     "--dtype", "float16", \
     "--max-model-len", "8192", \
     "--gpu-memory-utilization", "0.90", \
     "--max-num-seqs", "16", \
     "--limit-mm-per-prompt", "{\"image\":2,\"video\":0}"]
```

### 2. Critical Flags Explained

| Flag | Why It Is Mandatory |
|------|---------------------|
| `--enforce-eager` | **REQUIRED for VL models.** Disables CUDA graph capture which causes crashes with the vision encoder. Slight throughput reduction but prevents instability. |
| `--trust-remote-code` | Required for all Qwen model architectures. |
| `--limit-mm-per-prompt '{"image":2,"video":0}'` | Prevents OOM. Each high-res image can generate up to 16,384 visual tokens consuming KV cache memory. |
| `--max-model-len 8192` | Caps context window. The model supports 32K natively but 8192 conserves KV cache. Can increase to 16384 with the 9B model if needed. |
| `--gpu-memory-utilization 0.90` | Uses 90% of L4's 24GB = ~21.6 GB. Leaves ~2.4 GB buffer for vision spikes. |

### 3. Cloud Run Deployment Settings

```yaml
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "0"        # Scale-to-zero (Rule 08)
        autoscaling.knative.dev/maxScale: "1"         # Single instance
        run.googleapis.com/startup-cpu-boost: "true"   # Faster cold start
    spec:
      containerConcurrency: 16                         # Match --max-num-seqs
      timeoutSeconds: 300                              # Cold start + inference
      containers:
        - resources:
            limits:
              nvidia.com/gpu: "1"                      # Single L4
              memory: "16Gi"
              cpu: "4"
      nodeSelector:
        run.googleapis.com/accelerator: nvidia-l4
```

### 4. API Compatibility

**Text-only chat (no changes from previous setup):**
```json
{
  "model": "RedHatAI/Qwen3.5-9B-Instruct-quantized.w8a8",
  "messages": [
    {"role": "system", "content": "You are VibeOS Assistant."},
    {"role": "user", "content": "Hello, what can you do?"}
  ]
}
```

**Image input (new capability):**
```json
{
  "model": "RedHatAI/Qwen3.5-9B-Instruct-quantized.w8a8",
  "messages": [
    {
      "role": "user",
      "content": [
        {"type": "text", "text": "What is in this image?"},
        {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,..."}}
      ]
    }
  ]
}
```

### 5. Forbidden Patterns

- **Do NOT set `--tensor-parallel-size > 1`.** The 9B model fits on a single L4. Tensor parallelism is unnecessary overhead.
- **Do NOT omit `--enforce-eager`.** VL models will crash intermittently without it.
- **Do NOT use FP16/BF16 unquantized.** The model will work but wastes ~8 GB of VRAM for zero benefit. Always use W8A8 or BitsAndBytes 8-bit.
- **Do NOT set `--max-model-len > 16384`.** Wastes pre-allocated KV cache memory on a single L4 GPU.
- **Do NOT deploy to GCE.** Cloud Run with scale-to-zero is the correct target for a 9B model. Rule 24 (GCE multi-GPU) is deprecated.
