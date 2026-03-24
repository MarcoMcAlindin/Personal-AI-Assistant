import logging
import httpx
from typing import Dict, Optional
from .scoring import score_job

# Himalayas free public API — no key required.
# Strong AI/ML, fullstack, and remote engineering coverage.
# Docs: https://himalayas.app/jobs/api

class HimalayasScraper:
    API_URL = "https://himalayas.app/jobs/api"

    def __init__(self, supabase_client):
        self.supabase = supabase_client

    async def scrape_jobs_for_campaign(self, campaign: dict) -> dict:
        logging.info(f"Starting Himalayas scrape for campaign: {campaign['id']}")

        prefs = campaign.get("job_preferences", {})
        keywords = prefs.get("keywords", "")
        arrangement = (prefs.get("work_arrangement") or "").lower()
        max_results = campaign.get("max_results_per_run", 50)

        # Himalayas is remote-only
        if arrangement and arrangement != "remote":
            return {"scraped_count": 0, "status": "success"}

        params: dict = {"limit": min(max_results, 50)}
        if keywords:
            params["q"] = keywords

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(self.API_URL, params=params)
                resp.raise_for_status()
                data = resp.json()

            jobs = data.get("jobs", [])
            scraped_count = 0
            job_ids: list[str] = []

            for job in jobs[:max_results]:
                normalized = self._normalize_job(job, campaign)
                try:
                    res = self.supabase.table("inbox_items").insert(normalized).execute()
                    scraped_count += 1
                    if res.data and res.data[0].get("id"):
                        job_ids.append(res.data[0]["id"])
                except Exception:
                    continue  # duplicate

            logging.info(f"Himalayas scraped {scraped_count} jobs for campaign {campaign['id']}")
            return {"scraped_count": scraped_count, "status": "success", "job_ids": job_ids}

        except Exception as e:
            logging.error(f"Himalayas scraping error: {e}")
            return {"scraped_count": 0, "status": "failed", "error": str(e)}

    def _normalize_job(self, job: Dict, campaign: dict) -> Dict:
        title = job.get("title", "Unknown")
        company = (job.get("company") or {}).get("name", "Unknown Company")
        logo = (job.get("company") or {}).get("logo", None)
        description = job.get("description", "")
        url = job.get("applicationLink") or job.get("url", "")
        location = job.get("location", "Remote")

        salary_range = None
        sal_min = job.get("minSalary")
        sal_max = job.get("maxSalary")
        if sal_min and sal_max:
            salary_range = f"${int(sal_min):,} - ${int(sal_max):,}"
        elif sal_min:
            salary_range = f"${int(sal_min):,}+"

        match_score, match_reasoning = score_job(title, description, campaign)

        return {
            "campaign_id": campaign["id"],
            "user_id": campaign["user_id"],
            "source": "himalayas",
            "external_job_id": str(job.get("id", url)),
            "job_title": title,
            "company_name": company,
            "company_logo_url": logo,
            "location": location,
            "remote_type": "remote",
            "salary_range": salary_range,
            "job_url": url,
            "job_description": description,
            "status": "PENDING_REVIEW",
            "match_score": match_score,
            "match_reasoning": match_reasoning,
            "job_posted_at": job.get("createdAt") or None,
        }
