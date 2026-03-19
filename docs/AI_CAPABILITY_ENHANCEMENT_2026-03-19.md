# VibeOS AI Capability Enhancement Research
**Date:** 2026-03-19  
**Author:** Mr. Pink  

## 1. Current State & Limitations
The current VibeOS deployment suffers from several foundational AI limitations:
*   **"Stupid" / Text-Dump Behavior:** The currently deployed model (`Qwen3.5-35B-A3B-GGUF`) lacks instruction tuning (it is a base model). Base models are trained to predict the next word in a document rather than act as helpful, conversational assistants. They ignore system prompts and persona instructions, resulting in incoherent text completions rather than formatted answers.
*   **Lack of Multimodality:** The current vLLM setup and backend schemas accept text only. The user cannot upload images or videos for the AI to analyze.
*   **Lack of Agentic Action:** The AI acts as a read-only chatbot. It cannot execute actions on the user's behalf (e.g., sending emails, checking the calendar, or adding tasks to the planner) because the backend does not support the OpenAI Tool Calling API standard.

## 2. Research & Architectural Recommendations

### A. The Model Swap: Base to Instruct + Vision
To fix the immediate conversational issues and unlock multimodal/tool support, the Cloud Run deployment **must** swap to an instruction-tuned Vision-Language Model (VLM).
*   **Recommendation:** `Qwen/Qwen2.5-VL-32B-Instruct-GGUF` (or the 7B variant if VRAM constrained on the L4).
*   **Why:** `Instruct` models are explicitly fine-tuned on conversational datasets and system prompt obedience. The `VL` (Vision Language) architecture natively parses images and videos. Furthermore, Qwen2.5-VL natively supports OpenAI-compatible function calling.
*   *Note on Video:* Video in Qwen-VL is handled as a sequence of frames. The frontend must extract frames (e.g., 1 frame per second) or use vLLM's native video ingestion if supported, passing them as multiple `<image>` tokens.

### B. Function Calling (Tool Use) Architecture
To allow the AI to "do things," we must implement the Tool Calling execution loop in the Python FastAPI backend.
1.  **Tool Definition:** The backend `/chat` endpoint must define JSON Schemas for available tools (e.g., `send_email`, `add_task`, `get_calendar`).
2.  **Payload Injection:** The backend passes the user message + tool definitions to vLLM.
3.  **Execution Loop:** 
    * If vLLM responds with `tool_calls`, the backend intercepts the response *before* sending it to the user.
    * The backend parses the JSON arguments and executes the local Python function (e.g., calling the Google Calendar API or Supabase Tasks table).
    * The backend appends a `tool_result` message to the conversation history and calls vLLM a *second* time to let the AI summarize the result.
4.  **Security:** All tool executions happen server-side inside Cloud Run, leveraging the existing IAM and API keys safely.

### C. Rich Output Structuring & Persona
*   **Markdown Support:** The AI should be instructed in the system prompt to use rich markdown (tables, bolding, bullet points) for readability.
*   **System Prompt Overhaul:** The backend must inject a strong persona: *"You are VibeOS, a highly capable, concise, and proactive personal assistant. Format outputs beautifully. Use tools automatically when asked to perform actions."*

## 3. Implementation Plan (Cross-Agent Delegation)

### Phase 1: Mr. Red (Infrastructure & Models)
*   **Task:** Migrate `vllm_deployment` to use `Qwen2.5-VL-Instruct-GGUF`.
*   **Requirements:** Update vLLM startup flags to support tools (`--enable-auto-tool-choice`) and vision/video limits (`--limit-mm-per-prompt '{"image": 4, "video": 1}'`). Optimize the `Dockerfile` for the new instruct model.

### Phase 2: Mr. Green (Backend Tool Execution)
*   **Task:** Overhaul `backend/app/api/v1/endpoints.py` to support the Tool Execution Loop and Multimodal inputs.
*   **Requirements:** 
    *   Update `ChatRequest` to accept `attachments: List[dict]` (base64 data).
    *   Implement Pydantic tool schemas for `create_task`, `send_email`, and `get_agenda`.
    *   Build the recursive `chat_with_tools` loop that executes functions and chains the reasoning back to the AI.

### Phase 3: Mr. Blue (Frontend UI/UX)
*   **Task:** Upgrade the Vite Web and Expo Mobile Chat UIs.
*   **Requirements:**
    *   Add attachment buttons (Image/Video upload) to the chat input bar.
    *   Add dynamic UI states for tool execution (e.g., show a spinner reading "Agent is checking calendar..." when the backend is resolving a tool call).
    *   Ensure markdown rendering is robust for structured tables and lists.

## 4. Hybrid Multimodal Architecture (Alternative Strategy)

If maintaining the absolute highest-tier text reasoning (e.g., `Qwen2.5-32B-Instruct`) on a single L4 GPU is paramount, Multimodality can be decoupled entirely from the core model. You don't *need* a Vision-Language model to process images if the pre-processing layer handles the vision translation first.

### Option A: The "Two-Model" Pipeline
Instead of running one 7B VLM, the Cloud Run backend handles multimodality natively in tandem:
1.  **Vision Describer Model:** When an image is attached, the backend routes it to an ultra-small, lightning-fast vision model (like Microsoft's `Phi-3.5-vision` or a fast OCR engine like `Tesseract`) that strictly generates raw markdown descriptions or extracts text from the image.
2.  **Core Intelligence Engine (32B):** The backend stitches the generated image description into the chat context as system text: `[Attached Image Description: A promotional email for a concert on Friday...]` and sends it to your massive 32B Instruct model string.
*   *Pros:* Maximum text intelligence, very cheap.
*   *Cons:* Added backend complexity to manage the translation layer.

### Option B: Peripheral Offloading (Home PC / Cheap API)
Since VibeOS already features an Ollama routing architecture for the Home PC, you can offload vision tasks there:
- Send base64 image hashes securely to a small instance of `Llama3.2-Vision` running on your local Home PC. It parses the image, returns the context, and your massive 32B Cloud Run model makes the ultimate intelligent decisions using the text. 
- Alternatively, ping a near-free API solely for OCR mapping (like Google Cloud Vision or Amazon Rekognition) before constructing the context window for Qwen.
