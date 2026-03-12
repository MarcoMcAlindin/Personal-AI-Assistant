---
trigger: glob
globs: vllm_deployment/**, .github/workflows/**
---

# Cloud Run Scale-to-Zero

When configuring the Google Cloud Run deployment for the vLLM container:
- You MUST explicitly set `min-instances=0`. 
- The GPU container must scale to zero when idle to prevent excessive cloud billing.
- Ensure the GitHub Action for the 8:00 AM health analysis has a strict timeout configured so a hung process doesn't drain resources.