---
description:  Prepares the Qwen3.5-9B-Instruct AI container and backend for a Cloud Run deployment.  1. Review the `r
---

# Prepare Release
requirements.txt` in `/backend` and the `Dockerfile.qwen` in `/vllm_deployment` to ensure no debug flags or local environments are active.
2. Automatically format all Python code using `black` to ensure PEP 8 compliance.
3. Draft a `Release_Notes.md` Artifact summarizing all conventional commits (`feat:`, `fix:`) since the last deployment.
4. Ask the user for explicit confirmation before pushing the `staging` branch to the `main` production branch.