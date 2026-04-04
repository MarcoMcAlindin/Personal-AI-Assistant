import asyncio
import logging
import time
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, BackgroundTasks, Query
from fastapi.responses import RedirectResponse
from typing import Literal, Optional, List
from pydantic import BaseModel
from app.services.email_service import EmailService
from app.services.feed_service import FeedService
from app.services.health_service import HealthService
from app.services.notification_service import NotificationService
from app.services.rag_service import RAGService
from app.services.task_service import TaskService
from app.services.campaign_service import CampaignService
from app.services.spotify_service import SpotifyService
from app.models.schemas import (
    CampaignCreateRequest, CampaignUpdateRequest,
    InboxItemStatusUpdate, ApplicationCreateRequest, CoverLetterRequest,
    VoiceParseRequest, VoiceParseResponse,
)
from app.services.ai_service import call_ollama, chat_with_tools, generate_cover_letter, generate_interview_questions_ai
from app.services import cv_service
from app.utils.auth import get_current_user, get_optional_user
from app.utils.config import settings
import httpx
import json
import os
import secrets

router = APIRouter()
email_service = EmailService()
feed_service = FeedService()
health_service = HealthService()
notification_service = NotificationService()
rag_service = RAGService()
task_service = TaskService()
campaign_service = CampaignService()

spotify_service = SpotifyService(email_service.supabase)

class EmailSendRequest(BaseModel):
    to: str
    subject: str
    body: str
    thread_id: Optional[str] = None

class PushTokenRequest(BaseModel):
    token: str

class ChatRequest(BaseModel):
    message: str
    model_target: Optional[Literal['cloud', 'home_pc', 'device']] = 'cloud'
    ollama_url: Optional[str] = None
    attachments: Optional[List[dict]] = []

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
    urgency: Optional[str] = None

class TaskUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[int] = None
    time: Optional[str] = None
    status: Optional[str] = None
    is_archived: Optional[bool] = None
    urgency: Optional[str] = None

@router.get("/feeds/tech")
async def get_tech_feeds():
    news = await feed_service.get_tech_news()
    return {"articles": news}

@router.get("/feeds/concerts")
async def get_concert_feeds(
    my_artists: bool = Query(False, description="Filter concerts by Spotify top artists"),
    user_id: Optional[str] = Depends(get_optional_user),
):
    # Resolve Spotify artist list when caller requests personalised filtering
    spotify_artists = None
    if my_artists and user_id and spotify_service.supabase:
        cached = spotify_service.get_artist_list(user_id)
        if cached:
            spotify_artists = cached

    # feed_service applies artist filter internally; falls back to STATIC_METAL_ARTISTS
    # when spotify_artists is None so the response is always curated
    concerts = await feed_service.get_concerts(artist_names=spotify_artists)
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


# -- Email Contacts --------------------------------------------------------

@router.get("/email/contacts")
async def search_contacts(
    q: str = Query(default=""),
    user_id: str = Depends(get_current_user),
):
    """Search Google contacts for autocomplete."""
    contacts = await email_service.get_contacts(user_id, q)
    return {"contacts": contacts}

@router.get("/email/{message_id}")
async def get_email_body(message_id: str, user_id: str = Depends(get_current_user)):
    """Fetch full email body with HTML and inline images as base64 data URIs."""
    result = await email_service.fetch_email_body(user_id, message_id)
    return result


# -- Email AI Rewrite ------------------------------------------------------

@router.post("/email/rewrite")
async def rewrite_email(
    request: EmailRewriteRequest,
    _auth: str = Depends(get_current_user),
):
    """AI-powered email rewrite using Qwen."""
    qwen_url = os.environ.get("QWEN_ENDPOINT_URL")
    if not qwen_url:
        return {"rewritten": None, "error": "AI unavailable"}

    headers = {"Content-Type": "application/json", **_get_gcp_headers(qwen_url)}

    system_prompt = (
        f"You are an email writing assistant. Rewrite the following email draft "
        f"to be more {request.tone}. Preserve the core message and intent. "
        f"Never use em dashes (—); use a plain hyphen (-) instead. "
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
                    "max_tokens": 2048,
                    "temperature": 0.7,
                }
            )
            response.raise_for_status()
            data = response.json()
            rewritten = data["choices"][0]["message"]["content"].replace("\u2014", " - ").replace("\u2013", " - ")
            return {"rewritten": rewritten}
    except Exception as e:
        return {"rewritten": None, "error": f"AI rewrite failed: {str(e)}"}


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

    # 3. Cloud path — use agentic tool execution loop
    try:
        response_content = await chat_with_tools(
            message=request.message,
            context=context,
            user_id=user_id,
            attachments=request.attachments or [],
            services={
                "email": email_service,
                "task": task_service,
                "health": health_service
            }
        )
        return {"response": response_content}
    except httpx.HTTPStatusError as e:
        if e.response.status_code in (404, 503, 502):
            raise HTTPException(
                status_code=503,
                detail="AI model is warming up - please try again in a moment.",
            )
        raise HTTPException(status_code=500, detail=f"AI Service Error: {str(e)}")
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

@router.post("/tasks/parse-voice", response_model=VoiceParseResponse)
async def parse_voice_task(
    request: VoiceParseRequest,
    _auth: dict = Depends(get_current_user),
):
    """Extract structured task fields from a voice transcript using Qwen."""
    if not request.transcript.strip():
        raise HTTPException(status_code=422, detail="Transcript cannot be empty")

    system_prompt = """You are a task extraction assistant. Given a voice transcript, extract the following fields as JSON:
- title: short imperative task name (required, max 80 chars)
- description: any extra detail beyond the title (null if none)
- urgency: "high", "medium", or "low" based on these signals:
    high — "urgent", "important", "asap", "critical", "can't wait", "must"
    medium — "soon", "today", "need to", "should", implied time pressure; DEFAULT if unclear
    low — "whenever", "eventually", "maybe", no urgency signals
- time: 24-hour HH:MM if a time is mentioned (null otherwise)

Return only valid JSON with exactly these four keys. No explanation."""

    try:
        qwen_url = settings.qwen_endpoint_url
        headers = {"Content-Type": "application/json", **_get_gcp_headers(qwen_url)}
        payload = {
            "model": settings.qwen_model_name,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.transcript},
            ],
            "temperature": 0.1,
            "max_tokens": 200,
        }
        async with httpx.AsyncClient(timeout=30) as client_http:
            resp = await client_http.post(
                f"{qwen_url}/chat/completions",
                headers=headers,
                json=payload,
            )
            resp.raise_for_status()

        raw = resp.json()["choices"][0]["message"]["content"].strip()

        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        parsed = json.loads(raw)

        return VoiceParseResponse(
            title=parsed.get("title"),
            description=parsed.get("description"),
            urgency=parsed.get("urgency"),
            time=parsed.get("time"),
        )

    except Exception as e:
        print(f"[ParseVoice] Error: {e}")
        return VoiceParseResponse(
            title=None, description=None, urgency=None, time=None
        )


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


# -- Google OAuth ----------------------------------------------------------

GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/contacts.readonly",
    "https://www.googleapis.com/auth/contacts.other.readonly",
]

def _build_google_flow():
    """Build an OAuth2 Flow from env-based client config."""
    from google_auth_oauthlib.flow import Flow
    client_config = {
        "web": {
            "client_id": settings.gmail_client_id,
            "client_secret": settings.gmail_client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [settings.google_redirect_uri],
        }
    }
    flow = Flow.from_client_config(
        client_config,
        scopes=GOOGLE_SCOPES,
        redirect_uri=settings.google_redirect_uri,
    )
    return flow


@router.get("/auth/google/authorize")
async def google_authorize(user_id: str = Depends(get_current_user)):
    """
    Return a Google OAuth authorization URL for the current user.
    The frontend should redirect the browser to the returned authorization_url.
    """
    if not email_service.supabase:
        raise HTTPException(status_code=503, detail="Supabase not initialised")

    flow = _build_google_flow()
    random_token = secrets.token_urlsafe(32)
    # Encode user_id into state so callback can identify the user without JWT
    state_value = f"{user_id}:{random_token}"

    authorization_url, _ = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        include_granted_scopes="true",
        state=state_value,
    )

    # Persist the random token portion in users.settings for CSRF validation
    settings_row = email_service.supabase.table("users") \
        .select("settings") \
        .eq("id", user_id).single().execute()
    current_settings = settings_row.data.get("settings") or {}
    current_settings["google_oauth_state"] = random_token
    email_service.supabase.table("users").update({
        "settings": current_settings
    }).eq("id", user_id).execute()

    return {"authorization_url": authorization_url, "state": state_value}


@router.get("/auth/google/callback")
async def google_callback(
    code: str = Query(...),
    state: str = Query(...),
):
    """
    Google OAuth callback -- no JWT auth, this is a browser redirect from Google.
    State format: "{user_id}:{random_token}"
    """
    if not email_service.supabase:
        raise HTTPException(status_code=503, detail="Supabase not initialised")

    # Split state to recover user_id and the stored CSRF token
    parts = state.split(":", 1)
    if len(parts) != 2:
        raise HTTPException(status_code=400, detail="Invalid state parameter")
    user_id, random_token = parts

    # CSRF check: compare random_token against users.settings.google_oauth_state
    row = email_service.supabase.table("users") \
        .select("settings") \
        .eq("id", user_id).single().execute()
    stored_state = (row.data.get("settings") or {}).get("google_oauth_state")
    if not stored_state or stored_state != random_token:
        raise HTTPException(status_code=400, detail="OAuth state mismatch -- possible CSRF")

    # Exchange authorization code for tokens
    flow = _build_google_flow()
    flow.fetch_token(code=code)
    creds = flow.credentials

    expiry_iso = creds.expiry.isoformat() if creds.expiry else None

    # Store tokens in users.oauth_tokens.google (service role key client)
    email_service.supabase.table("users").update({
        "oauth_tokens": {
            "google": {
                "access_token": creds.token,
                "refresh_token": creds.refresh_token,
                "token_expiry": expiry_iso,
                "scopes": list(creds.scopes) if creds.scopes else GOOGLE_SCOPES,
            }
        }
    }).eq("id", user_id).execute()

    # Clear the one-time CSRF state from settings
    current_settings = (row.data.get("settings") or {})
    current_settings.pop("google_oauth_state", None)
    email_service.supabase.table("users").update({
        "settings": current_settings
    }).eq("id", user_id).execute()

    redirect_target = f"{settings.frontend_url}/integrations?connected=gmail"
    return RedirectResponse(url=redirect_target)


@router.get("/auth/google/status")
async def google_status(user_id: str = Depends(get_current_user)):
    """Return Gmail connection status for the current user."""
    if not email_service.supabase:
        raise HTTPException(status_code=503, detail="Supabase not initialised")

    row = email_service.supabase.table("users") \
        .select("oauth_tokens, email") \
        .eq("id", user_id).single().execute()

    google_tokens = (row.data.get("oauth_tokens") or {}).get("google", {})
    connected = bool(google_tokens.get("refresh_token"))
    user_email = row.data.get("email") if connected else None

    return {"gmail": {"connected": connected, "email": user_email}}


@router.delete("/auth/google/disconnect")
async def google_disconnect(user_id: str = Depends(get_current_user)):
    """Remove stored Google tokens for the current user."""
    if not email_service.supabase:
        raise HTTPException(status_code=503, detail="Supabase not initialised")

    # Read current oauth_tokens and clear the google key
    row = email_service.supabase.table("users") \
        .select("oauth_tokens") \
        .eq("id", user_id).single().execute()
    current_tokens = row.data.get("oauth_tokens") or {}
    current_tokens.pop("google", None)

    email_service.supabase.table("users").update({
        "oauth_tokens": current_tokens
    }).eq("id", user_id).execute()

    return {"disconnected": True}


# -- Spotify OAuth ----------------------------------------------------------

SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize"
SPOTIFY_SCOPES_LIST = ["user-top-read", "user-read-private"]


@router.get("/auth/spotify/authorize")
async def spotify_authorize(user_id: str = Depends(get_current_user)):
    """Return a Spotify OAuth authorization URL for the current user."""
    if not spotify_service.supabase:
        raise HTTPException(status_code=503, detail="Supabase not initialised")
    if not settings.spotify_client_id:
        raise HTTPException(status_code=503, detail="Spotify OAuth not configured")

    random_token = secrets.token_urlsafe(32)
    state_value = f"{user_id}:{random_token}"

    # Persist CSRF token in users.settings.spotify_oauth_state
    row = spotify_service.supabase.table("users") \
        .select("settings").eq("id", user_id).single().execute()
    current_settings = row.data.get("settings") or {}
    current_settings["spotify_oauth_state"] = random_token
    spotify_service.supabase.table("users").update({
        "settings": current_settings
    }).eq("id", user_id).execute()

    import urllib.parse
    params = {
        "client_id": settings.spotify_client_id,
        "response_type": "code",
        "redirect_uri": settings.spotify_redirect_uri,
        "scope": " ".join(SPOTIFY_SCOPES_LIST),
        "state": state_value,
    }
    authorization_url = f"{SPOTIFY_AUTH_URL}?{urllib.parse.urlencode(params)}"
    return {"authorization_url": authorization_url, "state": state_value}


@router.get("/auth/spotify/callback")
async def spotify_callback(
    code: str = Query(...),
    state: str = Query(...),
    error: Optional[str] = Query(None),
):
    """
    Spotify OAuth callback -- browser redirect from Spotify.
    State format: "{user_id}:{random_token}"
    """
    if error:
        redirect_target = f"{settings.frontend_url}/integrations?error=spotify_{error}"
        return RedirectResponse(url=redirect_target)

    if not spotify_service.supabase:
        raise HTTPException(status_code=503, detail="Supabase not initialised")

    parts = state.split(":", 1)
    if len(parts) != 2:
        raise HTTPException(status_code=400, detail="Invalid state parameter")
    user_id, random_token = parts

    # CSRF check
    row = spotify_service.supabase.table("users") \
        .select("settings").eq("id", user_id).single().execute()
    stored_state = (row.data.get("settings") or {}).get("spotify_oauth_state")
    if not stored_state or stored_state != random_token:
        raise HTTPException(status_code=400, detail="OAuth state mismatch -- possible CSRF")

    # Exchange code for tokens
    try:
        token_data = await spotify_service.exchange_code(
            code=code,
            redirect_uri=settings.spotify_redirect_uri,
            client_id=settings.spotify_client_id,
            client_secret=settings.spotify_client_secret,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Spotify token exchange failed: {e}")

    spotify_tokens = {
        "access_token": token_data["access_token"],
        "refresh_token": token_data.get("refresh_token", ""),
        "expires_at": int(time.time()) + token_data.get("expires_in", 3600),
        "provider": "spotify",
    }
    spotify_service._save_tokens(user_id, spotify_tokens)

    # Clear CSRF state
    current_settings = (row.data.get("settings") or {})
    current_settings.pop("spotify_oauth_state", None)
    spotify_service.supabase.table("users").update({
        "settings": current_settings
    }).eq("id", user_id).execute()

    # Immediately fetch and cache top artists
    try:
        artist_names = await spotify_service.fetch_top_artists(spotify_tokens["access_token"])
        if artist_names:
            spotify_service.save_artist_list(user_id, artist_names)
    except Exception as e:
        # Non-fatal — tokens are stored; artists will refresh on next call
        import logging
        logging.getLogger(__name__).warning("[Spotify] initial artist fetch failed: %s", e)

    redirect_target = f"{settings.frontend_url}/integrations?connected=spotify"
    return RedirectResponse(url=redirect_target)


@router.get("/auth/spotify/status")
async def spotify_status(user_id: str = Depends(get_current_user)):
    """Return Spotify connection status for the current user."""
    if not spotify_service.supabase:
        raise HTTPException(status_code=503, detail="Supabase not initialised")

    tokens = spotify_service._get_stored_tokens(user_id)
    connected = bool(tokens and tokens.get("refresh_token"))
    artist_names = spotify_service.get_artist_list(user_id) if connected else []

    return {
        "spotify": {
            "connected": connected,
            "artist_count": len(artist_names),
            "artists": artist_names,
        }
    }


@router.post("/auth/spotify/refresh-artists")
async def spotify_refresh_artists(user_id: str = Depends(get_current_user)):
    """Re-fetch the user's top artists from Spotify and update the cache."""
    if not spotify_service.supabase:
        raise HTTPException(status_code=503, detail="Supabase not initialised")

    access_token = await spotify_service.get_valid_access_token(
        user_id,
        settings.spotify_client_id,
        settings.spotify_client_secret,
    )
    if not access_token:
        raise HTTPException(status_code=401, detail="Spotify not connected or token expired")

    artist_names = await spotify_service.fetch_top_artists(access_token)
    spotify_service.save_artist_list(user_id, artist_names)

    return {"artists": artist_names, "count": len(artist_names)}


@router.delete("/auth/spotify/disconnect")
async def spotify_disconnect(user_id: str = Depends(get_current_user)):
    """Remove stored Spotify tokens and artist list for the current user."""
    if not spotify_service.supabase:
        raise HTTPException(status_code=503, detail="Supabase not initialised")

    row = spotify_service.supabase.table("users") \
        .select("oauth_tokens, settings").eq("id", user_id).single().execute()

    current_tokens = row.data.get("oauth_tokens") or {}
    current_tokens.pop("spotify", None)
    current_settings = row.data.get("settings") or {}
    current_settings.pop("spotify_artists", None)

    spotify_service.supabase.table("users").update({
        "oauth_tokens": current_tokens,
        "settings": current_settings,
    }).eq("id", user_id).execute()

    return {"disconnected": True}


# -- vLLM Status & Warmup --------------------------------------------------

def _get_gcp_headers(qwen_url: str) -> dict:
    """Get GCP identity token headers for IAM-protected vLLM service.
    Uses the GCP metadata server directly — more reliable than google-auth ADC in Cloud Run.
    """
    headers = {}
    try:
        import urllib.request as _req
        audience = qwen_url.split("/v1")[0].rstrip("/")
        meta_url = f"http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience={audience}"
        r = _req.Request(meta_url, headers={"Metadata-Flavor": "Google"})
        token = _req.urlopen(r, timeout=3).read().decode()
        headers["Authorization"] = f"Bearer {token}"
    except Exception as e:
        print(f"[GCPHeaders] metadata token fetch failed for {qwen_url}: {e}")
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
                target_model = os.environ.get("QWEN_MODEL_NAME", "unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF")
                
                # VOS-054 Fix: Ensure the actual model is loaded, not just the server responding
                is_ready = any(m.get("id") == target_model for m in models)
                
                if is_ready:
                    return {"status": "online", "model": target_model, "latency_ms": latency}
                elif models:
                    # Server is up but model name mismatch or still loading
                    return {"status": "warming", "model": models[0].get("id"), "latency_ms": latency}
                else:
                    return {"status": "warming", "model": None, "latency_ms": latency}
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

# -- Job Engine (Campaigns & Applications) --------------------------------

@router.get("/campaigns")
async def get_campaigns(user_id: str = Depends(get_current_user)):
    data = await campaign_service.get_campaigns(user_id)
    return {"campaigns": data}

@router.post("/campaigns")
async def create_campaign(request: CampaignCreateRequest, user_id: str = Depends(get_current_user)):
    result = await campaign_service.create_campaign(user_id, request.model_dump())
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result

@router.patch("/campaigns/{campaign_id}")
async def update_campaign(campaign_id: str, request: CampaignUpdateRequest, user_id: str = Depends(get_current_user)):
    result = await campaign_service.update_campaign(user_id, campaign_id, request.model_dump())
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result

@router.delete("/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: str, user_id: str = Depends(get_current_user)):
    """
    Delete a campaign and cascade-delete all related inbox_items.
    The cascade is enforced by the FK on inbox_items.campaign_id.
    """
    if not campaign_service.supabase:
        raise HTTPException(status_code=503, detail="Supabase not initialised")
    try:
        # Before deleting campaign, preserve applications by NULLing their FKs
        campaign_service.supabase.table("applications") \
            .update({"inbox_item_id": None, "campaign_id": None}) \
            .eq("campaign_id", campaign_id).eq("user_id", user_id).execute()
        # inbox_items FK has ON DELETE CASCADE — deleting the campaign removes inbox items
        res = campaign_service.supabase.table("campaigns") \
            .delete() \
            .eq("id", campaign_id) \
            .eq("user_id", user_id) \
            .execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Campaign not found")
        return {"deleted": campaign_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/inbox")
async def get_inbox_items(campaign_id: Optional[str] = None, user_id: str = Depends(get_current_user)):
    data = await campaign_service.get_inbox(user_id, campaign_id)
    return {"inbox_items": data}

@router.patch("/inbox/{item_id}/status")
async def update_inbox_item_status(item_id: str, request: InboxItemStatusUpdate, user_id: str = Depends(get_current_user)):
    result = await campaign_service.update_inbox_item(user_id, item_id, request.status)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result

@router.get("/applications")
async def get_applications(user_id: str = Depends(get_current_user)):
    data = await campaign_service.get_applications(user_id)
    return {"applications": data}

@router.post("/applications/cover-letter")
async def generate_cover_letter_endpoint(request: CoverLetterRequest, user_id: str = Depends(get_current_user)):
    # Modified: 2026-03-22 — New endpoint: fetches inbox item + campaign, calls Qwen to generate cover letter.
    # Uses .limit(1) instead of .single() to avoid APIError when row not found.
    if not campaign_service.supabase:
        raise HTTPException(status_code=503, detail="Supabase not initialised")
    try:
        item_res = campaign_service.supabase.table("inbox_items").select("*") \
            .eq("id", request.inbox_item_id).eq("user_id", user_id).limit(1).execute()
        if not item_res.data:
            raise HTTPException(status_code=404, detail="Inbox item not found")
        job = item_res.data[0]
        campaign_res = campaign_service.supabase.table("campaigns").select("*") \
            .eq("id", job["campaign_id"]).limit(1).execute()
        campaign = campaign_res.data[0] if campaign_res.data else {}
        # Inject the user's CV text so Qwen can personalise the letter
        cv_text = cv_service.get_primary_cv_text(campaign_service.supabase, user_id) or ""
        cover_letter = await generate_cover_letter(job, campaign, cv_text=cv_text)
        return {"cover_letter_text": cover_letter}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cover letter generation failed: {str(e)}")

async def _generate_cover_letter_background(
    application_id: str,
    user_id: str,
    inbox_item_id: str,
    supabase,
):
    """Background task: generate cover letter and write it back to the application row."""
    try:
        item_res = supabase.table("inbox_items").select("*") \
            .eq("id", inbox_item_id).eq("user_id", user_id).limit(1).execute()
        if not item_res.data:
            return
        job = item_res.data[0]
        campaign_res = supabase.table("campaigns").select("*") \
            .eq("id", job["campaign_id"]).limit(1).execute()
        campaign = campaign_res.data[0] if campaign_res.data else {}
        cv_text = cv_service.get_primary_cv_text(supabase, user_id) or ""
        cover_letter = await generate_cover_letter(job, campaign, cv_text=cv_text)
        supabase.table("applications") \
            .update({"cover_letter_text": cover_letter}) \
            .eq("id", application_id).execute()
        logging.info(f"Background cover letter written for application {application_id}")
    except Exception as e:
        logging.error(f"Background cover letter generation failed for {application_id}: {e}")


@router.post("/applications", status_code=201)
async def create_application(
    request: ApplicationCreateRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user),
):
    if not campaign_service.supabase:
        raise HTTPException(status_code=503, detail="Supabase not initialised")
    # Fetch inbox item for job snapshot
    item_res = campaign_service.supabase.table("inbox_items").select("*") \
        .eq("id", request.inbox_item_id).eq("user_id", user_id).limit(1).execute()
    job = item_res.data[0] if item_res.data else {}
    snapshot = {
        "job_snapshot": {
            "job_title": job.get("job_title"),
            "company_name": job.get("company_name"),
            "location": job.get("location"),
            "remote_type": job.get("remote_type"),
            "salary_range": job.get("salary_range"),
            "job_url": job.get("job_url"),
            "job_description": job.get("job_description"),
            "source": job.get("source"),
            "match_score": float(job.get("match_score") or 0),
        },
        "interview_questions": []
    }
    data = request.model_dump()
    data["cover_letter_metadata"] = snapshot
    data["campaign_id"] = job.get("campaign_id")
    data["cover_letter_text"] = ""
    result = await campaign_service.create_application(user_id, data)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    # Mark the inbox item as APPROVED
    await campaign_service.update_inbox_item(user_id, request.inbox_item_id, "APPROVED")
    # Fire cover letter generation in the background — returns immediately
    application_id = result.get("id")
    if application_id:
        background_tasks.add_task(
            _generate_cover_letter_background,
            application_id, user_id, request.inbox_item_id, campaign_service.supabase
        )
    return result


@router.delete("/applications/{application_id}")
async def delete_application(application_id: str, user_id: str = Depends(get_current_user)):
    """Permanently delete an application record."""
    if not campaign_service.supabase:
        raise HTTPException(status_code=503, detail="Supabase not initialised")
    try:
        res = campaign_service.supabase.table("applications") \
            .delete() \
            .eq("id", application_id) \
            .eq("user_id", user_id) \
            .execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Application not found")
        return {"deleted": application_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class CoverLetterSaveRequest(BaseModel):
    cover_letter_text: str

@router.patch("/applications/{application_id}/cover-letter")
async def save_cover_letter(
    application_id: str,
    request: CoverLetterSaveRequest,
    user_id: str = Depends(get_current_user),
):
    """Write a generated cover letter text back to the application row."""
    if not campaign_service.supabase:
        raise HTTPException(status_code=503, detail="Supabase not initialised")
    res = campaign_service.supabase.table("applications") \
        .update({"cover_letter_text": request.cover_letter_text}) \
        .eq("id", application_id).eq("user_id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Application not found")
    return res.data[0]


@router.patch("/applications/{application_id}/confirm")
async def confirm_application(application_id: str, user_id: str = Depends(get_current_user)):
    """Set application status to APPLIED and record applied_at timestamp."""
    if not campaign_service.supabase:
        raise HTTPException(status_code=503, detail="Supabase not initialised")
    res = campaign_service.supabase.table("applications") \
        .update({"status": "APPLIED", "applied_at": datetime.now(timezone.utc).isoformat()}) \
        .eq("id", application_id).eq("user_id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Application not found")
    return res.data[0]


@router.post("/applications/{application_id}/interview-questions")
async def generate_interview_questions_endpoint(application_id: str, user_id: str = Depends(get_current_user)):
    """Generate 5 interview questions for the job and store them in cover_letter_metadata."""
    if not campaign_service.supabase:
        raise HTTPException(status_code=503, detail="Supabase not initialised")
    res = campaign_service.supabase.table("applications").select("*") \
        .eq("id", application_id).eq("user_id", user_id).limit(1).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Application not found")
    app = res.data[0]
    metadata = app.get("cover_letter_metadata") or {}
    snapshot = metadata.get("job_snapshot", {})
    job_title = snapshot.get("job_title", "the role")
    job_description = (snapshot.get("job_description") or "")[:3000]
    cv_text = cv_service.get_primary_cv_text(campaign_service.supabase, user_id) or ""

    questions = await generate_interview_questions_ai(job_title, job_description, cv_text=cv_text)

    # Store questions back in cover_letter_metadata
    metadata["interview_questions"] = questions
    campaign_service.supabase.table("applications") \
        .update({"cover_letter_metadata": metadata}) \
        .eq("id", application_id).execute()

    return {"interview_questions": questions}

# ── CV endpoints ──────────────────────────────────────────────────────────────

ALLOWED_CV_TYPES = {
    "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
}
MAX_CV_BYTES = 10 * 1024 * 1024  # 10 MB

@router.post("/cv/upload")
async def upload_cv(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
):
    """
    Accept a CV file (PDF / DOCX / TXT), extract text, generate an OpenAI
    embedding, and store in cv_files.  Marks the new CV as primary and
    demotes previous ones.
    """
    if not campaign_service.supabase:
        raise HTTPException(status_code=503, detail="Supabase not initialised")

    data = await file.read()
    if len(data) > MAX_CV_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 10 MB)")

    mime = file.content_type or "application/octet-stream"
    if mime not in ALLOWED_CV_TYPES and not file.filename.lower().endswith((".pdf", ".doc", ".docx", ".txt")):
        raise HTTPException(status_code=415, detail=f"Unsupported file type: {mime}")

    parsed_text = cv_service.extract_text(data, file.filename)
    if not parsed_text.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from the file")

    embedding = await cv_service.embed_text(parsed_text)

    record = cv_service.save_cv(
        supabase=campaign_service.supabase,
        user_id=user_id,
        filename=file.filename,
        file_size_bytes=len(data),
        mime_type=mime,
        parsed_text=parsed_text,
        embedding=embedding,
    )
    return {"cv": record, "chars_extracted": len(parsed_text)}


@router.get("/cv")
async def list_cvs(user_id: str = Depends(get_current_user)):
    if not campaign_service.supabase:
        raise HTTPException(status_code=503, detail="Supabase not initialised")
    cvs = cv_service.list_cvs(campaign_service.supabase, user_id)
    return {"cvs": cvs}


@router.get("/cv/primary")
async def get_primary_cv(user_id: str = Depends(get_current_user)):
    """Return the active (primary) CV's text for the current user."""
    if not campaign_service.supabase:
        raise HTTPException(status_code=503, detail="Supabase not initialised")
    text = cv_service.get_primary_cv_text(campaign_service.supabase, user_id)
    if text is None:
        raise HTTPException(status_code=404, detail="No CV found")
    return {"parsed_text": text}


@router.patch("/cv/{cv_id}/set-primary")
async def set_primary_cv(cv_id: str, user_id: str = Depends(get_current_user)):
    """Mark one CV as primary and demote all others for this user."""
    if not campaign_service.supabase:
        raise HTTPException(status_code=503, detail="Supabase not initialised")
    try:
        campaign_service.supabase.table("cv_files") \
            .update({"is_primary": False}).eq("user_id", user_id).execute()
        res = campaign_service.supabase.table("cv_files") \
            .update({"is_primary": True}).eq("id", cv_id).eq("user_id", user_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="CV not found")
        return {"set_primary": cv_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cv/{cv_id}")
async def get_cv(cv_id: str, user_id: str = Depends(get_current_user)):
    if not campaign_service.supabase:
        raise HTTPException(status_code=503, detail="Supabase not initialised")
    res = campaign_service.supabase.table("cv_files") \
        .select("id, filename, file_size_bytes, mime_type, uploaded_at, is_primary, parsed_text") \
        .eq("id", cv_id).eq("user_id", user_id).limit(1).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="CV not found")
    return res.data[0]


@router.delete("/cv/{cv_id}")
async def delete_cv(cv_id: str, user_id: str = Depends(get_current_user)):
    if not campaign_service.supabase:
        raise HTTPException(status_code=503, detail="Supabase not initialised")
    deleted = cv_service.delete_cv(campaign_service.supabase, cv_id, user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="CV not found")
    return {"deleted": cv_id}


@router.post("/scrapers/run/{campaign_id}")
async def run_campaign_scraper(campaign_id: str, user_id: str = Depends(get_current_user)):
    from app.services.scrapers.multi_source_scraper import MultiSourceScraper
    scraper = MultiSourceScraper(campaign_service.supabase)

    campaigns = await campaign_service.get_campaigns(user_id)
    campaign = next((c for c in campaigns if c["id"] == campaign_id), None)
    if not campaign:
         raise HTTPException(status_code=404, detail="Campaign not found")

    result = await scraper.scrape_jobs_for_campaign(campaign)
    return result


# -- Push Notifications ----------------------------------------------------

@router.post("/users/push-token")
async def register_push_token(
    body: PushTokenRequest,
    user_id: str = Depends(get_current_user),
):
    """Store an Expo push token for the authenticated user."""
    if not email_service.supabase:
        raise HTTPException(status_code=503, detail="Supabase not initialised")

    row = email_service.supabase.table("users") \
        .select("push_tokens") \
        .eq("id", user_id).single().execute()

    tokens: list = row.data.get("push_tokens") or []
    if body.token not in tokens:
        tokens.append(body.token)
        email_service.supabase.table("users") \
            .update({"push_tokens": tokens}) \
            .eq("id", user_id).execute()

    return {"registered": True}


@router.delete("/users/push-token")
async def deregister_push_token(
    body: PushTokenRequest,
    user_id: str = Depends(get_current_user),
):
    """Remove a specific Expo push token for the authenticated user."""
    if not email_service.supabase:
        raise HTTPException(status_code=503, detail="Supabase not initialised")

    row = email_service.supabase.table("users") \
        .select("push_tokens") \
        .eq("id", user_id).single().execute()

    tokens: list = row.data.get("push_tokens") or []
    if body.token in tokens:
        tokens.remove(body.token)
        email_service.supabase.table("users") \
            .update({"push_tokens": tokens}) \
            .eq("id", user_id).execute()

    return {"removed": True}


@router.post("/email/poll")
async def poll_email(user_id: str = Depends(get_current_user)):
    """Fetch latest emails, compare against last-seen ID, and push-notify on new messages."""
    if not email_service.supabase:
        raise HTTPException(status_code=503, detail="Supabase not initialised")

    # Fetch settings and push tokens for this user
    row = email_service.supabase.table("users") \
        .select("settings, push_tokens") \
        .eq("id", user_id).single().execute()

    user_settings: dict = row.data.get("settings") or {}
    push_tokens: list = row.data.get("push_tokens") or []
    last_email_id: str = user_settings.get("last_email_id", "")

    # Fetch inbox (newest-first from Gmail)
    emails = await email_service.fetch_inbox(user_id)

    if not emails:
        return {"polled": True, "new_emails": 0}

    # Determine which emails are new (those appearing before last_email_id)
    ids = [e["id"] for e in emails]
    if last_email_id and last_email_id in ids:
        cutoff = ids.index(last_email_id)
        new_emails = emails[:cutoff]
    else:
        # First poll or ID has rotated out -- treat everything as new
        new_emails = emails

    # Send push notifications for each new email
    if push_tokens:
        for email in new_emails:
            sender = email.get("from", "Unknown sender")
            await notification_service.send_push_notification(
                tokens=push_tokens,
                title="New Email",
                body=f"From: {sender}",
                data={"email_id": email["id"]},
            )

    # Update last_email_id to the newest message seen this poll
    user_settings["last_email_id"] = emails[0]["id"]
    email_service.supabase.table("users") \
        .update({"settings": user_settings}) \
        .eq("id", user_id).execute()

    return {"polled": True, "new_emails": len(new_emails)}

