---
description: DEPRECATED — GCE multi-GPU inference is no longer the deployment target. See updated Rule 23 (Cloud Run GPU Governance) for current architecture.
trigger: never
---

# Rule 24: DEPRECATED — GCE Multi-GPU Inference

**Status:** DEPRECATED as of 2026-03-15.
**Reason:** Model transition from Qwen3.5-9B-Instruct (VL) to **Qwen3-Coder-30B-A3B-Instruct-GGUF** (Logic). The 30B model fits on 1x L4 / 24GB VRAM using Q4_K_S quantization. GCE Spot instances and multi-GPU tensor parallelism are no longer required for the assistant's core intelligence.

**Superseded by:** Rule 23 (`23-cloud-run-gpu-governance.md`) — which now governs the single-GPU Cloud Run deployment.

Any agent referencing Rule 24 must redirect to Rule 23. Do not create GCE instances for vLLM inference.
