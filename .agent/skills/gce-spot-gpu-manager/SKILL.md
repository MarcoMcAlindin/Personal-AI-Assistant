---
name: gce-spot-gpu-manager
description: DEPRECATED — GCE multi-GPU deployment is no longer used. See vllm-deployment-optimizer for current architecture.
---
# GCE Spot GPU Manager — DEPRECATED

**Status:** DEPRECATED as of 2026-03-15.
**Reason:** Model downgrade from Qwen 3.5 27B to Qwen2.5-VL-7B-Instruct. The 7B model fits on a single L4 GPU, making Cloud Run with scale-to-zero the correct deployment target. GCE Spot instances are no longer needed.

**Superseded by:** `vllm-deployment-optimizer` skill.

Do NOT follow instructions in this skill. Any agent referencing this skill must use `vllm-deployment-optimizer` instead.
