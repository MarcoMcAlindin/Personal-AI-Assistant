---
trigger: glob
globs: vllm_deployment/**, .github/workflows/**
---

# Cloud Run Scale-to-Zero

When configuring the Google Cloud Run deployment for the vLLM Qwen3.5-9B-Instruct container:
- You MUST explicitly set `min-instances=0`.
- The GPU container must scale to zero when idle to prevent excessive cloud billing.
- Expected cold start time: ~15-30 seconds for the 9B model (vs 60-90s for the former 29B model).
- Ensure the GitHub Action for the 8:00 AM health analysis has a strict timeout configured so a hung process doesn't drain resources.
- The 300s request timeout in `analyze_health.py` accounts for worst-case cold start + inference. Do not reduce it below 120s.
