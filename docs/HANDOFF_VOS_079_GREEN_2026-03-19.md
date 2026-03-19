# HANDOFF — VOS-079: Backend Tool Execution Loop (Phase 2)
**Agent:** Mr. Green  
**Date:** 2026-03-19  

## Objective
Overhaul the FastAPI `/chat` endpoint to support OpenAI-compatible Tool Calling and Multimodal (Image/Video) attachment parsing.

## Required Changes
### 1. Core API Types (`backend/app/api/v1/endpoints.py`)
- Update `ChatRequest` to optionally accept `attachments: List[dict]` (parsing Base64 image/video representations from Mr. Blue).

### 2. Tool Definition & Execution Logic
- Define JSON Schemas for available actions: `create_task(...)` and `send_email(...)`.
- When the user sends a message, inject the `tools` array into the vLLM `chat/completions` request.
- Create the recursive `chat_with_tools` loop:
  1. If vLLM replies with `tool_calls` instead of standard text content, securely parse the JSON arguments payload.
  2. Execute the corresponding local FastAPI service logic (e.g., `task_service.create_task()` saving to the Supabase DB).
  3. Re-append a `tool_result` message to the message history and hit vLLM a second time to force the Agent to generate a final human-readable success/failure summary.

## Verification
- Send a mock POST request to `/api/v1/chat` asking "Please create a task for tomorrow at 3 PM to call David".
- Verify that the backend successfully receives a `tool_calls` trigger from the Instruct model, executes the insertion via Supabase, and returns a verified conversational confirmation to the chat socket.
