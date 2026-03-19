import asyncio
import time
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends
from typing import Literal, Optional, List
from pydantic import BaseModel
from app.services.email_service import EmailService
from app.services.feed_service import FeedService
from app.services.health_service import HealthService
from app.services.rag_service import RAGService
from app.services.task_service import TaskService
from app.services.ai_service import call_ollama
from app.utils.auth import get_current_user
import httpx
import os

router = APIRouter()
email_service = EmailService()
feed_service = FeedService()
health_service = HealthService()
rag_service = RAGService()
task_service = TaskService()

class EmailSendRequest(BaseModel):
    to: str
    subject: str
    body: str
    thread_id: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    model_target: Optional[Literal['cloud', 'home_pc', 'device']] = 'cloud'
    ollama_url: Optional[str] = None

class HealthSyncPayload(BaseModel):
    heart_rate: Optional[float] = None
    sleep_duration: Optional[float] = None
    avg_heart_rate: Optional[float] = None
    water_liters: Optional[float] = None
    raw_watch_data: Optional[dict] = None
    timestamp: Optional[str] = None
    date: Optional[str] = None

class WaterLogRequest(BaseModel):
    amount_liters: float

class WhitelistAddRequest(BaseModel):
    email_address: str
    contact_name: Optional[str] = None

class EmailRewriteRequest(BaseModel):
    body: str
    tone: Optional[str] = "professional"

class TaskCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    duration: Optional[int] = None
    time: Optional[str] = None
    date: Optional[str] = None

class TaskUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[int] = None
    time: Optional[str] = None
    status: Optional[str] = None
    is_archived: Optional[bool] = None

@router.get("/feeds/tech")
async def get_tech_feeds():
    news = await feed_service.get_tech_news()
    return {"articles": news}

@router.get("/feeds/concerts")
async def get_concert_feeds():
    concerts = await feed_service.get_concerts()
    return {"concerts": concerts}

@router.get("/email/inbox")
async def get_email_inbox(user_id: str = Depends(get_current_user)):
    emails = await email_service.fetch_inbox(user_id)
    return {"emails": emails}

@router.post("/email/send")
async def send_email(request: EmailSendRequest, user_id: str = Depends(get_current_user)):
    success = await email_service.send_email(
        user_id=user_id,
        to=request.to,
        subject=request.subject,
        body=request.body,
        thread_id=request.thread_id
    )
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send email via proxy")
    return {"message": "Email sent successfully"}


# -- Email Whitelist -------------------------------------------------------

@router.get("/email/whitelist")
async def get_email_whitelist(user_id: str = Depends(get_current_user)):
    """Return all whitelisted email addresses for the current user."""
    entries = await email_service.get_whitelist_entries(user_id)
    return {"whitelist": entries}

@router.post("/email/whitelist")
async def add_to_whitelist(
    request: WhitelistAddRequest,
    user_id: str = Depends(get_current_user),
):
    """Add an email address to the user's whitelist."""
    result = await email_service.add_to_whitelist(
        user_id, request.email_address, request.contact_name
    )
    if "error" in result and "already" not in result["error"]:
        raise HTTPException(status_code=500, detail=result["error"])
    return result

@router.delete("/email/whitelist/{entry_id}")
async def remove_from_whitelist(
    entry_id: str,
    user_id: str = Depends(get_current_user),
):
    """Remove an email from the user's whitelist."""
    result = await email_service.remove_from_whitelist(user_id, entry_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


# -- Email AI Rewrite ------------------------------------------------------

@router.post("/email/rewrite")
async def rewrite_email(
    request: EmailRewriteRequest,
    user_id: str = Depends(get_current_user),
):
    """AI-powered email rewrite using Qwen."""
    qwen_url = os.environ.get("QWEN_ENDPOINT_URL")
    if not qwen_url:
        return {"rewritten": request.body, "note": "AI unavailable -- returned original"}

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

    system_prompt = (
        f"You are an email writing assistant. Rewrite the following email draft "
        f"to be more {request.tone}. Preserve the core message and intent. "
        f"Return ONLY the rewritten email body -- no preamble, no explanation."
    )

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{qwen_url.rstrip('/')}/chat/completions",
                headers=headers,
                json={
                    "model": os.environ.get("QWEN_MODEL_NAME", "unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF"),
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": request.body},
                    ],
                    "stream": False,
                    "max_tokens": 1024,
                    "temperature": 0.7,
                }
            )
            response.raise_for_status()
            data = response.json()
            return {"rewritten": data["choices"][0]["message"]["content"]}
    except Exception as e:
        return {"rewritten": request.body, "error": f"AI rewrite failed: {str(e)}"}


@router.post("/chat")
async def chat_with_ai(request: ChatRequest, user_id: str = Depends(get_current_user)):
    # 1. Build RAG Context
    context = await rag_service.build_context_block(user_id, request.message)

    # 2. Route to home_pc or reject device
    if request.model_target == 'device':
        raise HTTPException(
            status_code=400,
            detail="device model_target is local-only — do not route through backend",
        )

    if request.model_target == 'home_pc':
        ollama_url = request.ollama_url or os.environ.get("OLLAMA_ENDPOINT_URL")
        if not ollama_url:
            raise HTTPException(
                status_code=400,
                detail="home_pc model_target requires ollama_url in request body or OLLAMA_ENDPOINT_URL env var",
            )
        try:
            text = await call_ollama(request.message, context, ollama_url)
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"Ollama unreachable: {e}")
        return {"response": text, "model": "ollama/home_pc"}

    # 3. Cloud path (unchanged) — get Qwen endpoint
    qwen_url = os.environ.get("QWEN_ENDPOINT_URL")
    if not qwen_url:
        return {"response": f"[MOCK CONTEXT]: {context}\n\n[REPLY]: I am functioning in mock mode because QWEN_ENDPOINT_URL is missing."}

    # 3. Get GCP identity token for IAM-protected vLLM service
    qwen_base = qwen_url.rstrip("/v1").rstrip("/")
    headers = {"Content-Type": "application/json"}
    try:
        import google.auth.transport.requests
        import google.oauth2.id_token
        auth_req = google.auth.transport.requests.Request()
        identity_token = google.oauth2.id_token.fetch_id_token(auth_req, qwen_base)
        headers["Authorization"] = f"Bearer {identity_token}"
    except Exception:
        pass  # Local dev without GCP credentials -- skip auth

    # 4. Call vLLM Model with cold-start retry (3 attempts: 0s, 5s, 15s backoff)
    retry_delays = [0, 5, 15]
    last_error = None

    for attempt, delay in enumerate(retry_delays):
        if delay > 0:
            await asyncio.sleep(delay)

        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                ai_response = await client.post(
                    f"{qwen_url.rstrip('/')}/chat/completions",
                    headers=headers,
                    json={
                        "model": os.environ.get("QWEN_MODEL_NAME", "unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF"),
                        "messages": [
                            {"role": "system", "content": "You are VibeOS Assistant. Use the provided context to answer accurately."},
                            {"role": "user", "content": f"{context}\n\nUser Query: {request.message}"}
                        ],
                        "stream": False
                    }
                )
                ai_response.raise_for_status()
                data = ai_response.json()
                ai_content = data["choices"][0]["message"]["content"]

                # Strip Qwen chain-of-thought <think>...</think> blocks
                import re as _re
                ai_content = _re.sub(r'<think>.*?</think>', '', ai_content, flags=_re.DOTALL).strip()

                # Store both user message and AI response in chat_history
                try:
                    now = datetime.now(timezone.utc).isoformat()
                    rag_service.supabase.table("chat_history").insert([
                        {"user_id": user_id, "role": "user", "message": request.message, "timestamp": now},
                        {"user_id": user_id, "role": "assistant", "message": ai_content, "timestamp": now},
                    ]).execute()
                except Exception:
                    pass  # Don't fail the chat response if storage fails

                return {"response": ai_content}

        except (httpx.ConnectError, httpx.RemoteProtocolError) as e:
            last_error = e
            continue
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 503:
                last_error = e
                continue
            raise HTTPException(status_code=e.response.status_code, detail=f"AI Service Error: {str(e)}")
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="AI Service Timeout: model did not respond within 300 seconds")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"AI Service Error: {str(e)}")

    # All retries exhausted
    raise HTTPException(
        status_code=503,
        detail=f"AI Service unavailable after {len(retry_delays)} attempts. The model may be cold-starting -- try again in 30 seconds. Last error: {str(last_error)}",
    )

@router.post("/health/sync")
async def health_sync(
    payload: HealthSyncPayload,
    user_id: str = Depends(get_current_user),
):
    result = await health_service.sync_biometrics(user_id, payload.model_dump())
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result

@router.get("/health/metrics")
async def get_health_metrics(user_id: str = Depends(get_current_user)):
    metrics = await health_service.get_metrics(user_id)
    return {"metrics": metrics}

@router.get("/health/analysis")
async def get_health_analysis(user_id: str = Depends(get_current_user)):
    analysis = await health_service.get_analysis(user_id)
    return {"analysis": analysis}

@router.post("/health/water")
async def log_water(
    request: WaterLogRequest,
    user_id: str = Depends(get_current_user),
):
    result = await health_service.log_water(user_id, request.amount_liters)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result


# -- Tasks -----------------------------------------------------------------

@router.get("/tasks")
async def get_tasks(
    date: Optional[str] = None,
    include_archived: bool = False,
    user_id: str = Depends(get_current_user),
):
    """Get tasks for a date (defaults to today). Pass ?include_archived=true for archive view."""
    tasks = await task_service.get_tasks(user_id, task_date=date, include_archived=include_archived)
    return {"tasks": tasks}

@router.post("/tasks")
async def create_task(
    request: TaskCreateRequest,
    user_id: str = Depends(get_current_user),
):
    """Create a new task for the planner."""
    result = await task_service.create_task(user_id, request.model_dump())
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result

@router.patch("/tasks/{task_id}")
async def update_task(
    task_id: str,
    request: TaskUpdateRequest,
    user_id: str = Depends(get_current_user),
):
    """Update a task (toggle status, edit fields, archive)."""
    result = await task_service.update_task(user_id, task_id, request.model_dump())
    if "error" in result:
        if result["error"] == "Task not found":
            raise HTTPException(status_code=404, detail="Task not found")
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: str,
    user_id: str = Depends(get_current_user),
):
    """Delete a task permanently."""
    result = await task_service.delete_task(user_id, task_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


# -- Chat Save/Pin --------------------------------------------------------

@router.patch("/chat/save/{message_id}")
async def save_chat_message(message_id: str, user_id: str = Depends(get_current_user)):
    """Pin an AI response to permanent RAG memory by setting is_saved=true."""
    if not rag_service.supabase:
        raise HTTPException(status_code=503, detail="Supabase not available")
    try:
        result = rag_service.supabase.table("chat_history") \
            .update({"is_saved": True}) \
            .eq("id", message_id) \
            .eq("user_id", user_id) \
            .execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Message not found")
        return {"saved": True, "message_id": message_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save message: {str(e)}")


# -- vLLM Status & Warmup --------------------------------------------------

def _get_gcp_headers(qwen_url: str) -> dict:
    """Get GCP identity token headers for IAM-protected vLLM service."""
    headers = {}
    try:
        import google.auth.transport.requests
        import google.oauth2.id_token
        auth_req = google.auth.transport.requests.Request()
        qwen_base = qwen_url.rstrip("/v1").rstrip("/")
        identity_token = google.oauth2.id_token.fetch_id_token(auth_req, qwen_base)
        headers["Authorization"] = f"Bearer {identity_token}"
    except Exception:
        pass
    return headers

@router.get("/vllm/status")
async def vllm_status():
    """
    Probe the vLLM service to determine its readiness state.
    Returns: offline | warming | online
    No auth required -- status is not sensitive and frontends poll this.
    """
    qwen_url = os.environ.get("QWEN_ENDPOINT_URL")
    if not qwen_url:
        return {"status": "offline", "model": None, "latency_ms": 0, "detail": "QWEN_ENDPOINT_URL not configured"}

    models_url = f"{qwen_url.rstrip('/')}/models"
    headers = _get_gcp_headers(qwen_url)

    start = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(models_url, headers=headers)
            latency = round((time.monotonic() - start) * 1000)

            if response.status_code == 200:
                data = response.json()
                models = data.get("data", [])
                if models:
                    model_id = models[0].get("id", "unknown")
                    return {"status": "online", "model": model_id, "latency_ms": latency}
                else:
                    return {"status": "warming", "model": None, "latency_ms": latency, "detail": "Model loading"}
            else:
                return {"status": "warming", "model": None, "latency_ms": latency, "detail": f"vLLM returned {response.status_code}"}
    except httpx.ConnectError:
        latency = round((time.monotonic() - start) * 1000)
        return {"status": "offline", "model": None, "latency_ms": latency, "detail": "Connection refused"}
    except httpx.TimeoutException:
        latency = round((time.monotonic() - start) * 1000)
        return {"status": "warming", "model": None, "latency_ms": latency, "detail": "Probe timed out (instance likely starting)"}
    except Exception as e:
        latency = round((time.monotonic() - start) * 1000)
        return {"status": "offline", "model": None, "latency_ms": latency, "detail": str(e)}

@router.post("/vllm/warmup")
async def vllm_warmup():
    """
    Send a lightweight request to vLLM to trigger Cloud Run cold start.
    Returns immediately -- the actual warmup happens in the background.
    No auth required -- triggering a cold start is not sensitive.
    """
    qwen_url = os.environ.get("QWEN_ENDPOINT_URL")
    if not qwen_url:
        return {"status": "offline", "message": "QWEN_ENDPOINT_URL not configured"}

    models_url = f"{qwen_url.rstrip('/')}/models"
    headers = _get_gcp_headers(qwen_url)

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.get(models_url, headers=headers)
    except Exception:
        pass  # Expected to timeout on cold start -- that's fine

    return {"status": "warming", "message": "Warmup request sent -- instance will be ready in 15-30 seconds"}
