import httpx
import os
import logging
from typing import Dict, Optional, List
from datetime import datetime

# Modified: 2026-03-22
# What: Added try/except around inbox_items insert to handle duplicate external_job_id gracefully.
# Why: Without it, a duplicate row violation aborts the insertion loop entirely, causing all
#      subsequent jobs in the batch to be silently dropped.

class CrustdataScraper:
    def __init__(self, supabase_client):
        self.supabase = supabase_client
        self.api_key = os.environ.get("CRUSTDATA_API_KEY", "")
        self.base_url = "https://api.crustdata.com/v1"
        # We instantiate a new client inside async methods to avoid async context issues,
        # or we just re-use an async client safely.
        
    async def scrape_jobs_for_campaign(self, campaign: dict) -> dict:
        """
        Executes a background search query against Crustdata for a campaign.
        Saves the results directly to Supabase inbox_items.
        """
        if not self.api_key or self.api_key == "your_crustdata_api_key_here":
            logging.warning("CRUSTDATA_API_KEY not configured. Simulating response.")
            return {"scraped_count": 0, "status": "simulated_success", "error": "API Key Missing"}

        logging.info(f"Starting Crustdata scrape for campaign: {campaign['id']}")
        
        prefs = campaign.get("job_preferences", {})
        # Flatten role_titles as a query block
        query = " OR ".join(prefs.get("role_titles", []))
        
        # Build params
        params = {
            "query": query,
            "limit": campaign.get("max_results_per_run", 50)
        }
        
        if prefs.get("locations"):
            params["location"] = prefs["locations"][0] # simplified

        try:
            async with httpx.AsyncClient(headers={"Authorization": f"Bearer {self.api_key}"}) as client:
                response = await client.get(
                    f"{self.base_url}/jobs/search",
                    params=params
                )
                response.raise_for_status()
                data = response.json()
                
                jobs = data.get("jobs", [])
                scraped_count = 0
                
                for raw_job in jobs:
                    normalized = self._normalize_job(raw_job, campaign)
                    try:
                        self.supabase.table("inbox_items").insert(normalized).execute()
                        scraped_count += 1
                    except Exception:
                        # Likely a duplicate external_job_id — skip silently.
                        continue
                
                return {"scraped_count": scraped_count, "status": "success"}

        except Exception as e:
            logging.error(f"Crustdata API error: {e}")
            return {"scraped_count": 0, "status": "failed", "error": str(e)}

    def _normalize_job(self, raw_job: Dict, campaign: dict) -> Dict:
        """Convert Crustdata schema to inbox_items schema."""
        return {
            "campaign_id": campaign['id'],
            "user_id": campaign['user_id'],
            "source": "crustdata",
            "external_job_id": str(raw_job.get("id")),
            "job_title": raw_job.get("title", "Unknown Title"),
            "company_name": raw_job.get("company", {}).get("name", "Unknown Company"),
            "company_logo_url": raw_job.get("company", {}).get("logo_url"),
            "location": raw_job.get("location"),
            "remote_type": self._parse_remote_type(raw_job),
            "salary_range": self._parse_salary(raw_job),
            "job_url": raw_job.get("apply_url", ""),
            "job_description": raw_job.get("description", ""),
            "status": "PENDING_REVIEW",
            "match_score": 0.8, # Placeholder for AI semantic scoring until we run semantic_matcher task
            "match_reasoning": "Keyword match based on Campaign preferences."
        }
    
    def _parse_remote_type(self, job: Dict) -> Optional[str]:
        if job.get("remote") is True:
            return "remote"
        if job.get("hybrid") is True:
            return "hybrid"
        return "onsite"
    
    def _parse_salary(self, job: Dict) -> Optional[str]:
        salary = job.get("salary")
        if not salary:
            return None
        min_sal = salary.get("min")
        max_sal = salary.get("max")
        currency = salary.get("currency", "USD")
        if min_sal and max_sal:
            return f"{currency} {min_sal:,} - {max_sal:,}"
        return None
