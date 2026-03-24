# SuperCyan — Pydantic Schemas
# Request/response models for all API endpoints
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class CampaignCreateRequest(BaseModel):
    name: str
    job_preferences: Dict[str, Any] = Field(default_factory=dict)
    search_sources: List[str] = ["crustdata", "linkedin"]
    search_frequency_hours: int = 24
    max_results_per_run: int = 50

class CampaignUpdateRequest(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    job_preferences: Optional[Dict[str, Any]] = None

class InboxItemStatusUpdate(BaseModel):
    status: str

class ApplicationCreateRequest(BaseModel):
    inbox_item_id: str
    cover_letter_text: str

class CoverLetterRequest(BaseModel):
    inbox_item_id: str

class VoiceParseRequest(BaseModel):
    transcript: str

class VoiceParseResponse(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    urgency: Optional[str] = None   # "high" | "medium" | "low"
    time: Optional[str] = None      # HH:MM or null
