import httpx
import os
import logging
from typing import Dict, Optional, List
from datetime import datetime
from .scoring import score_job

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
        query = prefs.get("keywords", "") or campaign.get("name", "")

        params = {
            "query": query,
            "limit": campaign.get("max_results_per_run", 50)
        }

        if prefs.get("location"):
            params["location"] = prefs["location"]

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
                job_ids: list[str] = []

                for raw_job in jobs:
                    normalized = self._normalize_job(raw_job, campaign)
                    try:
                        res = self.supabase.table("inbox_items").insert(normalized).execute()
                        scraped_count += 1
                        if res.data and res.data[0].get("id"):
                            job_ids.append(res.data[0]["id"])
                    except Exception:
                        # Likely a duplicate external_job_id — skip silently.
                        continue

                return {"scraped_count": scraped_count, "status": "success", "job_ids": job_ids}

        except Exception as e:
            logging.error(f"Crustdata API error: {e}")
            return {"scraped_count": 0, "status": "failed", "error": str(e)}

    def _normalize_job(self, raw_job: Dict, campaign: dict) -> Dict:
        """Convert Crustdata schema to inbox_items schema."""
        title = raw_job.get("title", "Unknown Title")
        description = raw_job.get("description", "")
        match_score, match_reasoning = score_job(title, description, campaign)
        return {
            "campaign_id": campaign['id'],
            "user_id": campaign['user_id'],
            "source": "crustdata",
            "external_job_id": str(raw_job.get("id")),
            "job_title": title,
            "company_name": raw_job.get("company", {}).get("name", "Unknown Company"),
            "company_logo_url": raw_job.get("company", {}).get("logo_url"),
            "location": raw_job.get("location"),
            "remote_type": self._parse_remote_type(raw_job),
            "salary_range": self._parse_salary(raw_job),
            "job_url": raw_job.get("apply_url", ""),
            "job_description": description,
            "status": "PENDING_REVIEW",
            "match_score": match_score,
            "match_reasoning": match_reasoning,
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
