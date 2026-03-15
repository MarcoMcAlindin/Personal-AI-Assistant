from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from pydantic import BaseModel
from app.services.email_service import EmailService
from app.services.feed_service import FeedService
from app.services.rag_service import RAGService
from app.utils.auth import get_current_user

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
    # Build RAG Context
    context = await rag_service.build_context_block(user_id, request.message)

    # Placeholder for AI Response (VOS-011 territory)
    # This will eventually stream tokens.
    mock_response = f"AI Response with context length {len(context)}: Understood. I've analyzed your 10-day history."

    return {
        "context_summary": f"{len(context)} chars of context injected",
        "response": mock_response
    }

@router.post("/health-sync")
async def health_sync(user_id: str = Depends(get_current_user)):
    return {"message": "Placeholder: Biometric data synchronization endpoint."}
