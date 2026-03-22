import logging
import httpx
from typing import Dict
from .scoring import score_job

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
        job_type = (prefs.get("job_type") or "").lower()            # "full-time" | "part-time"
        arrangement = (prefs.get("work_arrangement") or "").lower() # "remote" | "hybrid" | "onsite"

        # Remotive is remote-only — skip if onsite/hybrid requested
        if arrangement and arrangement != "remote":
            logging.info("Remotive skipped: campaign requests non-remote arrangement")
            return {"scraped_count": 0, "status": "success"}

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
                # Client-side job_type filter
                if job_type:
                    combined = f"{job.get('title','')} {job.get('description','')}".lower()
                    if job_type not in combined and job_type.replace("-", " ") not in combined:
                        continue
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
        title = job.get("title", "Unknown")
        description = job.get("description", "")
        salary = job.get("salary", "")
        match_score, match_reasoning = score_job(title, description, campaign)

        # Remotive returns ISO date string in "publication_date"
        job_posted_at = job.get("publication_date") or None

        return {
            "campaign_id": campaign["id"],
            "user_id": campaign["user_id"],
            "source": "remotive",
            "external_job_id": str(job.get("id", "")),
            "job_title": title,
            "company_name": job.get("company_name", "Unknown Company"),
            "company_logo_url": job.get("company_logo_url"),
            "location": job.get("candidate_required_location", "Remote"),
            "remote_type": "remote",
            "salary_range": salary if salary else None,
            "job_url": job.get("url", ""),
            "job_description": description,
            "status": "PENDING_REVIEW",
            "match_score": match_score,
            "match_reasoning": match_reasoning,
            "job_posted_at": job_posted_at,
        }
