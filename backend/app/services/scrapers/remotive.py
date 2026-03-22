import logging
import httpx
from typing import Dict

class RemotiveScraper:
    """
    Scrapes Remotive's free public API (no API key required).
    Docs: https://remotive.com/api/remote-jobs
    """
    API_URL = "https://remotive.com/api/remote-jobs"

    def __init__(self, supabase_client):
        self.supabase = supabase_client

    async def scrape_jobs_for_campaign(self, campaign: dict) -> dict:
        logging.info(f"Starting Remotive scrape for campaign: {campaign['id']}")

        prefs = campaign.get("job_preferences", {})
        keywords = prefs.get("keywords", "")

        params = {}
        if keywords:
            params["search"] = keywords
        params["limit"] = campaign.get("max_results_per_run", 50)

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(self.API_URL, params=params)
                resp.raise_for_status()
                data = resp.json()

            jobs = data.get("jobs", [])
            max_results = campaign.get("max_results_per_run", 50)

            scraped_count = 0
            for job in jobs[:max_results]:
                normalized = self._normalize_job(job, campaign)
                try:
                    self.supabase.table("inbox_items").insert(normalized).execute()
                    scraped_count += 1
                except Exception:
                    continue  # duplicate

            logging.info(f"Remotive scraped {scraped_count} jobs for campaign {campaign['id']}")
            return {"scraped_count": scraped_count, "status": "success"}

        except Exception as e:
            logging.error(f"Remotive scraping error: {e}")
            return {"scraped_count": 0, "status": "failed", "error": str(e)}

    def _normalize_job(self, job: Dict, campaign: dict) -> Dict:
        salary = job.get("salary", "")
        return {
            "campaign_id": campaign["id"],
            "user_id": campaign["user_id"],
            "source": "remotive",
            "external_job_id": str(job.get("id", "")),
            "job_title": job.get("title", "Unknown"),
            "company_name": job.get("company_name", "Unknown Company"),
            "company_logo_url": job.get("company_logo_url"),
            "location": job.get("candidate_required_location", "Remote"),
            "remote_type": "remote",
            "salary_range": salary if salary else None,
            "job_url": job.get("url", ""),
            "job_description": job.get("description", ""),
            "status": "PENDING_REVIEW",
            "match_score": 0.8,
            "match_reasoning": "Sourced from Remotive — curated remote job board."
        }
