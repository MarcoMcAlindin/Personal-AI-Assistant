---
name: cover-letter-generator
description: Prompt orchestration for ATS-optimized cover letters using the internal Qwen3-Coder vLLM instance.
---
# Cover Letter Generation

## Model Constraints
Always point the FastAPI caller to our internal vLLM endpoint `/v1/chat/completions` using the `unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF` model.

## Prompting Strategy
- Qwen3 responds exceedingly well to structured prompt blocks.
- Inject the `CANDIDATE CV` and `JOB POSTING` explicitly inside `<context>` XML tags or clear markdown headers.
- Strictly enforce the output format to be plain text, bypassing its tendency to add markdown blocks. Use the system prompt: `Output EXACTLY the plain text of the cover letter. Do not include introductory conversational filler.`
- Avoid `temperature > 0.4` to prevent hallucinating experiences that aren't on the CV. Keep temperature around `0.2` for professional, exact ATS keyword matching.
