import logging
import httpx
from typing import Dict
from .scoring import score_job

class RemoteOKScraper:
    """
    Scrapes RemoteOK's free public API (no API key required).
    Docs: https://remoteok.com/api
    """
    API_URL = "https://remoteok.com/api"

    def __init__(self, supabase_client):
        self.supabase = supabase_client

    async def scrape_jobs_for_campaign(self, campaign: dict) -> dict:
        logging.info(f"Starting RemoteOK scrape for campaign: {campaign['id']}")

        prefs = campaign.get("job_preferences", {})
        keywords = prefs.get("keywords", "")
        job_type = (prefs.get("job_type") or "").lower()              # "full-time" | "part-time"
        arrangement = (prefs.get("work_arrangement") or "").lower()   # "remote" | "hybrid" | "onsite"

        # RemoteOK uses tags in the URL: /api?tags=python,react
        tags = ",".join(w.strip().lower().replace(" ", "-") for w in keywords.split(",") if w.strip())
        url = f"{self.API_URL}?tags={tags}" if tags else self.API_URL

        try:
            async with httpx.AsyncClient(
                timeout=30.0,
                headers={"User-Agent": "SuperCyan-JobEngine/1.0"}  # RemoteOK blocks default httpx UA
            ) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                data = resp.json()

            # First element is metadata, rest are jobs
            jobs = [j for j in data if isinstance(j, dict) and j.get("position")]
            max_results = campaign.get("max_results_per_run", 50)

            scraped_count = 0
            for job in jobs[:max_results]:
                # Client-side job_type filter: RemoteOK has no API param for it
                if job_type:
                    combined = f"{job.get('position','')} {job.get('description','')}".lower()
                    if job_type not in combined and job_type.replace("-", " ") not in combined:
                        continue
                # work_arrangement: all RemoteOK jobs are remote; skip if onsite/hybrid requested
                if arrangement and arrangement != "remote":
                    continue
                normalized = self._normalize_job(job, campaign)
                try:
                    self.supabase.table("inbox_items").insert(normalized).execute()
                    scraped_count += 1
                except Exception:
                    continue  # duplicate

            logging.info(f"RemoteOK scraped {scraped_count} jobs for campaign {campaign['id']}")
            return {"scraped_count": scraped_count, "status": "success"}

        except Exception as e:
            logging.error(f"RemoteOK scraping error: {e}")
            return {"scraped_count": 0, "status": "failed", "error": str(e)}

    def _normalize_job(self, job: Dict, campaign: dict) -> Dict:
        salary_min = job.get("salary_min")
        salary_max = job.get("salary_max")
        salary_range = None
        if salary_min and salary_max:
            salary_range = f"${int(salary_min):,} - ${int(salary_max):,}"
        elif salary_min:
            salary_range = f"${int(salary_min):,}+"

        title = job.get("position", "Unknown")
        description = job.get("description", "")
        match_score, match_reasoning = score_job(title, description, campaign)
        return {
            "campaign_id": campaign["id"],
            "user_id": campaign["user_id"],
            "source": "remoteok",
            "external_job_id": str(job.get("id", job.get("url", ""))),
            "job_title": title,
            "company_name": job.get("company", "Unknown Company"),
            "company_logo_url": job.get("company_logo"),
            "location": "Remote",
            "remote_type": "remote",
            "salary_range": salary_range,
            "job_url": job.get("url", ""),
            "job_description": description,
            "status": "PENDING_REVIEW",
            "match_score": match_score,
            "match_reasoning": match_reasoning,
        }
