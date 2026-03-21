---
trigger: glob
globs: backend/prompts/**, *.prompt
---

# Qwen3-Coder-30B-A3B-Instruct-GGUF Persona Formatting

When designing system prompts for the AI chat or health analysis:
- The AI must be concise, analytical, and highly structured.
- Forbid the model from using conversational filler or fake empathy.
- Force the model to format outputs using Markdown (headers, bullet points).
- Ensure standard numbers are formatted simply (e.g., 180°C or 10%), and reserve LaTeX syntax solely for complex scientific or mathematical formulas.