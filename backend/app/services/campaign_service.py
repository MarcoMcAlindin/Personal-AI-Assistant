import os
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from supabase import create_client, Client

class CampaignService:
    def __init__(self):
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if url and key:
            self.supabase: Client = create_client(url, key)
        else:
            self.supabase = None

    async def get_campaigns(self, user_id: str) -> List[Dict]:
        if not self.supabase:
            return []
        result = self.supabase.table("campaigns").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return result.data

    async def create_campaign(self, user_id: str, data: dict) -> Dict:
        if not self.supabase:
            return {"error": "Supabase not initialized"}
        
        payload = {
            "user_id": user_id,
            "name": data["name"],
            "job_preferences": data.get("job_preferences", {}),
            "search_sources": data.get("search_sources", ["crustdata", "linkedin"]),
            "search_frequency_hours": data.get("search_frequency_hours", 24),
            "max_results_per_run": data.get("max_results_per_run", 50),
            "status": "DRAFT"
        }
        result = self.supabase.table("campaigns").insert(payload).execute()
        campaign = result.data[0] if result.data else None
        
        if campaign:
            # Trigger 'cold-start' AI analysis in background
            # In a real production app, this would be a Celery/Redis task.
            # For this MVP, we'll do it as an async task if possible, 
            # or just run it here before returning (at the cost of some latency).
            try:
                from .ai_service import generate_campaign_analysis
                # We'll run it in the background so the user gets the campaign UI immediately
                asyncio.create_task(self._run_initial_analysis(campaign["id"], data))
            except Exception as e:
                print(f"Failed to trigger analysis: {e}")
                
        return campaign if campaign else {"error": "Insert failed"}

    async def _run_initial_analysis(self, campaign_id: str, campaign_data: dict):
        """Background worker for cold-start AI analysis."""
        try:
            from .ai_service import generate_campaign_analysis
            analysis = await generate_campaign_analysis(campaign_data)
            self.supabase.table("campaigns").update({
                "ai_analysis": analysis,
                "status": "RUNNING"  # Move from DRAFT to RUNNING once analyzed
            }).eq("id", campaign_id).execute()
        except Exception as e:
            print(f"Background analysis failed: {e}")
            self.supabase.table("campaigns").update({"status": "RUNNING"}).eq("id", campaign_id).execute()


    async def update_campaign(self, user_id: str, campaign_id: str, data: dict) -> Dict:
        if not self.supabase:
            return {"error": "Supabase not initialized"}
        
        filtered = {k: v for k, v in data.items() if v is not None}
        if not filtered:
            return {"error": "No updates provided"}
            
        filtered["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = self.supabase.table("campaigns").update(filtered).eq("id", campaign_id).eq("user_id", user_id).execute()
        return result.data[0] if result.data else {"error": "Update failed"}

    async def get_inbox(self, user_id: str, campaign_id: Optional[str] = None) -> List[Dict]:
        if not self.supabase:
            return []
            
        query = self.supabase.table("inbox_items").select("*").eq("user_id", user_id)
        if campaign_id:
            query = query.eq("campaign_id", campaign_id)
        result = query.order("match_score", desc=True).execute()
        return result.data

    async def update_inbox_item(self, user_id: str, item_id: str, status: str) -> Dict:
        if not self.supabase:
            return {"error": "Supabase not initialized"}
            
        result = self.supabase.table("inbox_items").update({
            "status": status,
            "reviewed_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", item_id).eq("user_id", user_id).execute()
        return result.data[0] if result.data else {"error": "Update failed"}

    async def get_applications(self, user_id: str) -> List[Dict]:
        if not self.supabase:
            return []
        result = self.supabase.table("applications").select("*, inbox_items(*)").eq("user_id", user_id).order("created_at", desc=True).execute()
        return result.data

    async def create_application(self, user_id: str, data: dict) -> Dict:
        if not self.supabase:
            return {"error": "Supabase not initialized"}

        payload = {
            "inbox_item_id": data["inbox_item_id"],
            "user_id": user_id,
            "cover_letter_text": data["cover_letter_text"],
            "status": "READY_TO_APPLY"
        }
        if data.get("campaign_id"):
            payload["campaign_id"] = data["campaign_id"]
        if data.get("cover_letter_metadata"):
            payload["cover_letter_metadata"] = data["cover_letter_metadata"]
        result = self.supabase.table("applications").insert(payload).execute()
        return result.data[0] if result.data else {"error": "Insert failed"}
