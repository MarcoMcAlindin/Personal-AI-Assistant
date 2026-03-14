from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from pydantic import BaseModel
from app.services.email_service import EmailService
from app.services.feed_service import FeedService

router = APIRouter()
email_service = EmailService()
feed_service = FeedService()

class EmailSendRequest(BaseModel):
    to: str
    subject: str
    body: str
    thread_id: Optional[str] = None

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

@router.get("/chat")
async def chat_with_ai():
    return {"message": "Placeholder: AI chat and RAG context endpoint."}

@router.post("/health-sync")
async def health_sync():
    return {"message": "Placeholder: Biometric data synchronization endpoint."}
