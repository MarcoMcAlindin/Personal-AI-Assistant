---
trigger: glob
globs: backend/**, scripts/**
---

# Python Supremacy for Backend & Automation

Whenever building backend routing, parsing data, or writing utility automation scripts, always use Python natively. It is definitively the better option for this project's backend orchestration.
- Do not use bash scripts, Node.js edge functions, or shell commands for data manipulation.
- All external API parsers (Scottish Metal concerts, Tech feeds) must be written as robust Python modules.
- Ensure all FastAPI endpoints are `async def` to handle concurrent I/O operations without blocking.