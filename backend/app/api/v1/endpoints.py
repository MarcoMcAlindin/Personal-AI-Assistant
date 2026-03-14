from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from pydantic import BaseModel
from app.services.email_service import EmailService
from app.services.feed_service import FeedService
from app.services.rag_service import RAGService
import httpx
import os

router = APIRouter()
email_service = EmailService()
feed_service = FeedService()
rag_service = RAGService()

class EmailSendRequest(BaseModel):
    to: str
    subject: str
    body: str
    thread_id: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    user_id: str = "placeholder_user_id"

@router.get("/feeds/tech")
async def get_tech_feeds():
    news = await feed_service.get_tech_news()
    return {"articles": news}

@router.get("/feeds/concerts")
async def get_concert_feeds():
    concerts = await feed_service.get_concerts()
    return {"concerts": concerts}

@router.get("/email/inbox")
async def get_email_inbox(user_id: str = "placeholder_user_id"):
    emails = await email_service.fetch_inbox(user_id)
    return {"emails": emails}

@router.post("/email/send")
async def send_email(request: EmailSendRequest, user_id: str = "placeholder_user_id"):
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
async def chat_with_ai(request: ChatRequest):
    # 1. Build RAG Context
    context = await rag_service.build_context_block(request.user_id, request.message)
    
    # 2. Get Qwen Endpoint
    qwen_url = os.environ.get("QWEN_ENDPOINT_URL")
    if not qwen_url:
        return {"response": f"[MOCK CONTEXT]: {context}\n\n[REPLY]: I am functioning in mock mode because QWEN_ENDPOINT_URL is missing."}

    # 3. Call vLLM Model
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            ai_response = await client.post(
                f"{qwen_url}/v1/chat/completions",
                json={
                    "model": "Qwen/Qwen3.5-27B",
                    "messages": [
                        {"role": "system", "content": "You are VibeOS Assistant. Use the provided context to answer accurately."},
                        {"role": "user", "content": f"{context}\n\nUser Query: {request.message}"}
                    ],
                    "stream": False
                }
            )
            ai_response.raise_for_status()
            data = ai_response.json()
            return {"response": data["choices"][0]["message"]["content"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Service Error: {str(e)}")

@router.post("/health-sync")
async def health_sync():
    return {"message": "Placeholder: Biometric data synchronization endpoint."}
