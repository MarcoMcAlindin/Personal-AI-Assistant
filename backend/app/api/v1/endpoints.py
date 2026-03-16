from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from pydantic import BaseModel
from app.services.email_service import EmailService
from app.services.feed_service import FeedService
from app.services.health_service import HealthService
from app.services.rag_service import RAGService
from app.utils.auth import get_current_user
import httpx
import os

router = APIRouter()
email_service = EmailService()
feed_service = FeedService()
health_service = HealthService()
rag_service = RAGService()

class EmailSendRequest(BaseModel):
    to: str
    subject: str
    body: str
    thread_id: Optional[str] = None

class ChatRequest(BaseModel):
    message: str

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

@router.post("/chat")
async def chat_with_ai(request: ChatRequest, user_id: str = Depends(get_current_user)):
    # 1. Build RAG Context
    context = await rag_service.build_context_block(user_id, request.message)

    # 2. Get Qwen Endpoint
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
        pass  # Local dev without GCP credentials — skip auth

    # 4. Call vLLM Model (300s timeout for cold-start)
    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            ai_response = await client.post(
                f"{qwen_url.rstrip('/')}/chat/completions",
                headers=headers,
                json={
                    "model": os.environ.get("QWEN_MODEL_NAME", "RedHatAI/Qwen2.5-VL-7B-Instruct-quantized.w8a8"),
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Service Error: {str(e)}")

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
