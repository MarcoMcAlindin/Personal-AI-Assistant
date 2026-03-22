# SuperCyan — AI Service
# unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF (cloud llama.cpp) agentic multi-tool router

import os
import httpx
import asyncio
import re
import json
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

async def call_ollama(message: str, rag_context: str, ollama_url: str) -> str:
    """Proxy chat request to a user's Ollama instance with RAG context."""
    base = ollama_url.rstrip('/')
    system_prompt = (
        "You are SuperCyan Assistant. Use the following context to answer the user's question.\n\n"
        f"Context:\n{rag_context}"
        if rag_context
        else "You are SuperCyan Assistant."
    )
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{base}/v1/chat/completions",
            json={
                "model": os.environ.get("OLLAMA_MODEL_NAME", "qwen2.5:7b"),
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message},
                ],
                "stream": False,
            },
            headers={"Content-Type": "application/json"},
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]

async def chat_with_tools(
    message: str,
    context: str,
    user_id: str,
    attachments: List[dict],
    services: Dict[str, Any]
) -> str:
    """
    Agentic tool execution loop. Calls vLLM, processes tool_calls, 
    and recurses until a final text response is reached.
    """
    qwen_url = os.environ.get("QWEN_ENDPOINT_URL")
    if not qwen_url:
        return f"[MOCK CONTEXT]: {context}\n\n[REPLY]: I am functioning in mock mode because QWEN_ENDPOINT_URL is missing."

    # 1. Define Tools (OpenAI format)
    tools = [
        {
            "type": "function",
            "function": {
                "name": "get_emails",
                "description": "Fetch the user's latest whitelisted emails from their inbox.",
                "parameters": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "add_task",
                "description": "Add a new task to the user's planner/calendar.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string", "description": "Short title of the task"},
                        "date": {"type": "string", "description": "ISO date string (YYYY-MM-DD)"},
                        "time": {"type": "string", "description": "Time string (HH:MM)"},
                        "duration": {"type": "integer", "description": "Duration in minutes"},
                        "description": {"type": "string", "description": "More details"}
                    },
                    "required": ["title"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_health_summary",
                "description": "Retrieve health biometrics (heart rate, sleep, water) for recent days.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "days": {"type": "integer", "description": "Number of days to retrieve (default 1)"}
                    },
                    "required": []
                }
            }
        }
    ]

    # 2. Prepare Messages with multimodal support
    content_list: List[Dict[str, Any]] = [{"type": "text", "text": f"Context:\n{context}\n\nUser Query: {message}"}]
    
    for att in attachments:
        # Attachment format expected from frontend: { "type": "image", "data": "base64..." }
        if att.get("type") == "image":
            content_list.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{att['data']}"}
            })
        elif att.get("type") == "video":
             # Note: vLLM support for video varies, mapping to image_url sequence or similar if supported
             content_list.append({
                "type": "video_url",
                "video_url": {"url": f"data:video/mp4;base64,{att['data']}"}
            })

    messages = [
        {
            "role": "system", 
            "content": "You are SuperCyan Assistant, a premium AI personal assistant. "
                       "You have access to tools for email, tasks, and health. "
                       "If you use a tool, explain what you are doing in the final response. "
                       "Always strip <think> tags from your final output."
        },
        {"role": "user", "content": content_list}
    ]

    # 3. Execution Loop
    max_iterations = 5
    headers = {"Content-Type": "application/json"}
    
    # GCP Identity Token logic for IAM-protected vLLM
    try:
        import google.auth.transport.requests
        import google.oauth2.id_token
        auth_req = google.auth.transport.requests.Request()
        qwen_base = qwen_url.rstrip("/v1").rstrip("/")
        identity_token = google.oauth2.id_token.fetch_id_token(auth_req, qwen_base)
        headers["Authorization"] = f"Bearer {identity_token}"
    except Exception:
        pass

    async with httpx.AsyncClient(timeout=300.0) as client:
        for i in range(max_iterations):
            # Model Call
            resp = await client.post(
                f"{qwen_url.rstrip('/')}/chat/completions",
                headers=headers,
                json={
                    "model": os.environ.get("QWEN_MODEL_NAME", "unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF"),
                    "messages": messages,
                    "tools": tools,
                    "tool_choice": "auto",
                    "max_tokens": 2048,
                    "temperature": 0.2
                }
            )
            resp.raise_for_status()
            res_data = resp.json()
            message_obj = res_data["choices"][0]["message"]
            
            # Ensure the object is added to history for context
            messages.append(message_obj)

            if not message_obj.get("tool_calls"):
                # No more tools, final response reached
                final_content = message_obj.get("content") or ""
                # Strip <think> tags
                final_content = re.sub(r'<think>.*?</think>', '', final_content, flags=re.DOTALL).strip()
                
                # Store history in Supabase via the provided service
                try:
                    now = datetime.now(timezone.utc).isoformat()
                    services["health"].supabase.table("chat_history").insert([
                        {"user_id": user_id, "role": "user", "message": message, "timestamp": now},
                        {"user_id": user_id, "role": "assistant", "message": final_content, "timestamp": now},
                    ]).execute()
                except Exception:
                    pass

                return final_content

            # Process Tool Calls
            for tool_call in message_obj["tool_calls"]:
                call_id = tool_call["id"]
                fn_name = tool_call["function"]["name"]
                fn_args = json.loads(tool_call["function"]["arguments"])
                
                print(f"[Tool Execution] {fn_name} with {fn_args}")
                
                tool_result = "Error: Tool execution failed"

                try:
                    if fn_name == "get_emails":
                        emails = await services["email"].fetch_inbox(user_id)
                        tool_result = json.dumps(emails)
                    elif fn_name == "add_task":
                        task = await services["task"].create_task(user_id, fn_args)
                        tool_result = json.dumps(task)
                    elif fn_name == "get_health_summary":
                        days = fn_args.get("days", 1)
                        metrics = await services["health"].get_metrics(user_id, days=days)
                        tool_result = json.dumps(metrics)
                except Exception as e:
                    tool_result = f"Error executing {fn_name}: {str(e)}"

                messages.append({
                    "role": "tool",
                    "tool_call_id": call_id,
                    "name": fn_name,
                    "content": tool_result
                })

async def generate_campaign_analysis(campaign_data: dict, cv_text: Optional[str] = None) -> Dict[str, Any]:
    """
    Generates a 'cold-start' analysis for a new job campaign.
    Returns structured JSON with overall_performance and match_factors.
    """
    qwen_url = os.environ.get("QWEN_ENDPOINT_URL")
    if not qwen_url:
        return {
            "overall_performance": "AI analysis is currently offline. Please check your configuration.",
            "match_factors": []
        }

    prompt = f"""
    Analyze the following job search campaign and provide a premium, encouraging strategic analysis.
    
    Campaign Name: {campaign_data.get('name')}
    Keywords: {campaign_data.get('job_preferences', {}).get('keywords')}
    Location: {campaign_data.get('job_preferences', {}).get('location')}
    Min Salary: {campaign_data.get('job_preferences', {}).get('salary')}
    
    User CV Context: {cv_text[:2000] if cv_text else "No CV provided yet."}
    
    Return ONLY a valid JSON object with this structure:
    {{
        "overall_performance": "A 2-3 sentence strategic overview of the campaign's potential and how it aligns with the user's profile.",
        "match_factors": [
            {{ "title": "Factor Title (e.g. Technical Depth)", "description": "Short explanation of why this is a match" }},
            ... (exactly 3 factors)
        ]
    }}
    """

    messages = [
        {"role": "system", "content": "You are a professional career strategist and executive recruiter AI. Return JSON only."},
        {"role": "user", "content": prompt}
    ]

    headers = {"Content-Type": "application/json"}
    try:
        import google.auth.transport.requests
        import google.oauth2.id_token
        auth_req = google.auth.transport.requests.Request()
        qwen_base = qwen_url.rstrip("/v1").rstrip("/")
        identity_token = google.oauth2.id_token.fetch_id_token(auth_req, qwen_base)
        headers["Authorization"] = f"Bearer {identity_token}"
    except Exception:
        pass

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            f"{qwen_url.rstrip('/')}/chat/completions",
            headers=headers,
            json={
                "model": os.environ.get("QWEN_MODEL_NAME", "unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF"),
                "messages": messages,
                "temperature": 0.3,
                "response_format": { "type": "json_object" }
            }
        )
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"]
        # Strip potential markdown code blocks
        content = re.sub(r'```json\n?|\n?```', '', content).strip()
        return json.loads(content)

