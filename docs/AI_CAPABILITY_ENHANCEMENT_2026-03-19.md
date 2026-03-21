# SuperCyan AI Capability Enhancement Plan — March 2026

This document outlines the strategic upgrade to the SuperCyan intelligence layer using the `unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF` model.

## Core Objectives
1. **Intelligence Upgrade**: Switch to a 30B parameter Coder-Instruct model for superior logic and tool calling.
2. **Reliability**: Fix the 16-token response truncation issue by explicit `max_tokens` management.
3. **Agentic Action**: Enable the assistant to actually *do* things (Email, Tasks, Health) via a backend tool loop.

## Roadmap & Assignments

| Phase | Task ID | Agent | description | Status |
|---|---|---|---|---|
| **Phase 1** | VOS-078 | **RED** | Deploy 30B Model to Cloud Run (L4 GPU) | **READY** |
| **Phase 2** | VOS-079 | **GREEN** | Implement Backend Tool Execution Loop | **READY** |
| **Phase 3** | VOS-080 | **BLUE** | Intelligent UI/UX & Tool Visualization | **READY** |

## Shared Context
- **Model**: `unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF` (Q4_K_S)
- **VRAM Budget**: ~22GB total (Safe on 24GB L4 with Q4_0 KV Cache)
- **Context Window**: 32,768 tokens (Expanded from 8k)
- **Output Limit**: 4,096 tokens (Expanded from 2k)
- **Backend Port**: 8000
- **Cloud Run Port**: 8080

---
*Created by Agent Pink — Brain for SuperCyan.*
