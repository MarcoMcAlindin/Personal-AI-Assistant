import httpx
import os
import logging
import asyncio
from typing import Dict, Optional, List

class ProxycurlScraper:
    def __init__(self, supabase_client):
        self.supabase = supabase_client
        self.api_key = os.environ.get("PROXYCURL_API_KEY", "")
        self.base_url = "https://nubela.co/proxycurl/api/v2"
        
    async def scrape_jobs_for_campaign(self, campaign: dict) -> dict:
        """
        Executes a background search query against Proxycurl for a campaign.
        Saves the results directly to Supabase inbox_items.
        """
        if not self.api_key or self.api_key == "your_proxycurl_api_key_here":
            logging.warning("PROXYCURL_API_KEY not configured. Simulating response.")
            return {"scraped_count": 0, "status": "simulated_success", "error": "API Key Missing"}

        logging.info(f"Starting Proxycurl scrape for campaign: {campaign['id']}")
        
        prefs = campaign.get("job_preferences", {})
        keyword = prefs.get("keywords", "engineer")
        
        params = {
            "search_terms": keyword,
            "page_size": campaign.get("max_results_per_run", 10)
        }
        
        try:
            async with httpx.AsyncClient(headers={"Authorization": f"Bearer {self.api_key}"}) as client:
                response = await client.get(
                    f"{self.base_url}/linkedin/company/job",
                    params=params
                )
                if response.status_code == 429:
                    logging.warning("Proxycurl Rate limited. Backing off.")
                    await asyncio.sleep(5)
                    return {"scraped_count": 0, "status": "rate_limited"}
                response.raise_for_status()
                data = response.json()
                
                jobs = data.get("job_list", [])
                scraped_count = 0
                
                for raw_job in jobs:
                    normalized = self._normalize_job(raw_job, campaign)
                    self.supabase.table("inbox_items").insert(normalized).execute()
                    scraped_count += 1
                
                return {"scraped_count": scraped_count, "status": "success"}

        except Exception as e:
            logging.error(f"Proxycurl API error: {e}")
            return {"scraped_count": 0, "status": "failed", "error": str(e)}

    def _normalize_job(self, raw_job: Dict, campaign: dict) -> Dict:
        """Convert Proxycurl schema to inbox_items schema."""
        return {
            "campaign_id": campaign['id'],
            "user_id": campaign['user_id'],
            "source": "proxycurl",
            "external_job_id": str(raw_job.get("job_url", "")),
            "job_title": raw_job.get("job_title", "Unknown Title"),
            "company_name": raw_job.get("company_name", "Unknown Company"),
            "company_logo_url": None,
            "location": raw_job.get("location"),
            "remote_type": "onsite",
            "salary_range": None,
            "job_url": raw_job.get("job_url", ""),
            "job_description": raw_job.get("job_description", ""),
            "status": "PENDING_REVIEW",
            "match_score": 0.7,
            "match_reasoning": "Keyword match based on Campaign preferences."
        }
