---
description: DEPRECATED — GCE multi-GPU inference is no longer the deployment target. See updated Rule 23 (Cloud Run GPU Governance) for current architecture.
trigger: never
---

# Rule 24: DEPRECATED — GCE Multi-GPU Inference

**Status:** DEPRECATED as of 2026-03-15.
**Reason:** Model downgrade from Qwen 3.5 27B (required 2x L4 GPUs / 48GB VRAM) to **Qwen2.5-VL-7B-Instruct** (fits on 1x L4 / 24GB VRAM). GCE Spot instances and tensor parallelism are no longer required.

**Superseded by:** Rule 23 (`23-cloud-run-gpu-governance.md`) — which now governs the single-GPU Cloud Run deployment.

Any agent referencing Rule 24 must redirect to Rule 23. Do not create GCE instances for vLLM inference.
