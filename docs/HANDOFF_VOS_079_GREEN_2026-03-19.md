# HANDOFF — VOS-079: AI Tool Execution Loop (Phase 2)
**Agent:** Mr. Green  
**Date:** 2026-03-19  

## Objective
Leverage the new `Qwen3-Coder-30B` model's reasoning capabilities to implement the **Tool Execution Loop** in the FastAPI backend.

## Required Changes

### 1. Tool Definitions (`backend/app/api/v1/endpoints.py`)
- Define the OpenAI-compatible `tools` array for the AI call.
- Tools should include:
    - `get_emails` (Search inbox)
    - `add_task` (Calendar/Planner integration)
    - `analyze_health` (Summarize biometrics)

### 2. Execution Logic (`backend/app/services/ai_service.py`)
- Implement a recursive or iterative loop that processes `tool_calls` returned by the model.
- Execute the corresponding service functions (EmailService, TaskService) and feed the results back to the model for a final conversational response.

## Verification
- Send a query like "Do I have any emails from the bank?" and verify the AI calls the email tool and summarizes the result.
- Verify "Add a task to buy groceries at 5 PM" triggers the TaskService tool.

---
**Status:** [READY]
**Dependencies:** VOS-078 (Model must be online with tool-calling support).
