import logging
import httpx
import os
from typing import Dict, List, Optional

class SerperScraper:
    def __init__(self, supabase_client):
        self.supabase = supabase_client
        self.api_url = "https://google.serper.dev/jobs"
        self.api_key = os.environ.get("SERPER_API_KEY")

    async def scrape_jobs_for_campaign(self, campaign: dict) -> dict:
        """
        Executes a search query against Serper Jobs API for a campaign.
        Saves results to Supabase inbox_items.
        """
        if not self.api_key:
            logging.error("SERPER_API_KEY not configured")
            return {"scraped_count": 0, "status": "failed", "error": "Serper API key missing"}

        logging.info(f"Starting Serper scrape for campaign: {campaign['id']}")
        
        prefs = campaign.get("job_preferences", {})
        keywords = prefs.get("keywords", "Software Engineer")
        location = prefs.get("location", "Remote")
        
        # Target LinkedIn specifically
        query = f"{keywords} jobs in {location} site:linkedin.com"
        
        payload = {
            "q": query,
            "gl": "us", 
            "hl": "en"
        }
        
        headers = {
            'X-API-KEY': self.api_key,
            'Content-Type': 'application/json'
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(self.api_url, headers=headers, json=payload)
                resp.raise_for_status()
                data = resp.json()
                
                jobs = data.get("jobs", [])
                scraped_count = 0
                max_results = campaign.get("max_results_per_run", 50)
                
                inserted_ids = []
                for job in jobs:
                    if scraped_count >= max_results:
                        break
                    
                    normalized = self._normalize_job(job, campaign)
                    # Insert into inbox items
                    try:
                        self.supabase.table("inbox_items").insert(normalized).execute()
                        scraped_count += 1
                    except Exception as ins_err:
                        # Likely a duplicate external_job_id, which is fine
                        continue
                
                return {"scraped_count": scraped_count, "status": "success"}

        except Exception as e:
            logging.error(f"Serper Scraping error: {e}")
            return {"scraped_count": 0, "status": "failed", "error": str(e)}

    def _normalize_job(self, job: Dict, campaign: dict) -> Dict:
        """Convert Serper Job schema to inbox_items schema."""
        description = job.get("description", "")
        
        # Basic remote detection
        remote_type = "hybrid" if "hybrid" in description.lower() else "remote" if "remote" in description.lower() else "onsite"
        
        return {
            "campaign_id": campaign['id'],
            "user_id": campaign['user_id'],
            "source": "serper-linkedin",
            "external_job_id": job.get("job_id", job.get("link", "")),
            "job_title": job.get("title", "Unknown"),
            "company_name": job.get("company", "Unknown Company"),
            "company_logo_url": job.get("thumbnail"), 
            "location": job.get("location", "Unknown"),
            "remote_type": remote_type,
            "salary_range": None, 
            "job_url": job.get("link", ""),
            "job_description": description,
            "status": "PENDING_REVIEW",
            "match_score": 0.85, 
            "match_reasoning": f"Sourced via Serper Jobs API for LinkedIn listing. Original source: {job.get('source', 'Serper/Google')}."
        }
