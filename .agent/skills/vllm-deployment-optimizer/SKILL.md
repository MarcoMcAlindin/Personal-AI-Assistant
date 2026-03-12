---
name: vllm-deployment-optimizer
description: Maximizes Google Cloud Run efficiency and prevents idle GPU charges.
---
# vLLM Deployment Optimizer
## When to use this skill
- When updating the `Dockerfile` or `cloudbuild.yaml` for the AI inference container.
## How to use it
1. **Scale-to-Zero:** Strictly enforce the Cloud Run configuration `min-instances=0`. 
2. **Concurrency Limits:** Set appropriate concurrency limits based on allocated GPU memory to prevent OOM crashes.
