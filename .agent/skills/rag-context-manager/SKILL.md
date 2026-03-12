---
name: rag-context-manager
description: Governs the complex RAG logic for the Qwen 3.5 AI memory.
---
# RAG Context Manager
## When to use this skill
- When configuring the prompt construction payload sent to the vLLM Cloud Run instance.
## How to use it
1. **10-Day Rolling Window:** Strictly enforce a timestamp filter that ignores any standard message older than 10 days.
2. **Permanent Save Override:** Your SQL query MUST include an `OR` condition. If `is_saved = TRUE`, that message must be retrieved.
