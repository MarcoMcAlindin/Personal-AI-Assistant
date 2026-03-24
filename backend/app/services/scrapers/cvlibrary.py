import logging
import httpx
import os
from typing import Dict
from .scoring import score_job

# CV-Library API — free registration at https://api.cv-library.co.uk/
# One of the UK's largest job boards; extremely strong agency coverage.
# Auth: API key passed as `?api_key=...` query parameter.
# Docs: https://api.cv-library.co.uk/docs

class CVLibraryScraper:
    API_URL = "https://api.cv-library.co.uk/v2/jobs/search"

    def __init__(self, supabase_client):
        self.supabase = supabase_client
        self.api_key = os.environ.get("CVLIBRARY_API_KEY", "")

    async def scrape_jobs_for_campaign(self, campaign: dict) -> dict:
        if not self.api_key:
            logging.warning("CVLIBRARY_API_KEY not configured — skipping CV-Library")
            return {"scraped_count": 0, "status": "skipped", "error": "CV-Library API key missing"}

        logging.info(f"Starting CV-Library scrape for campaign: {campaign['id']}")

        prefs = campaign.get("job_preferences", {})
        keywords = prefs.get("keywords", "")
        location = prefs.get("location", "")
        arrangement = (prefs.get("work_arrangement") or "").lower()
        max_results = campaign.get("max_results_per_run", 50)

        params: dict = {
            "api_key": self.api_key,
            "keywords": keywords,
            "results_per_page": min(max_results, 100),
            "page": 1,
            "sort": "date",
        }

        if location and "remote" not in location.lower():
            params["location"] = location
            params["distance"] = 30  # miles

        if arrangement == "remote":
            params["keywords"] = f"{keywords} remote".strip()
            params["work_type"] = "remote"

        # Salary minimum
        salary_pref = prefs.get("salary", "")
        if salary_pref:
            import re
            num = re.search(r"[\d,]+", salary_pref.replace(",", ""))
            if num:
                try:
                    params["salary_min"] = int(num.group().replace(",", ""))
                except ValueError:
                    pass

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(self.API_URL, params=params)
                resp.raise_for_status()
                data = resp.json()

            jobs = data.get("jobs", data.get("results", []))
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

            logging.info(f"CV-Library scraped {scraped_count} jobs for campaign {campaign['id']}")
            return {"scraped_count": scraped_count, "status": "success", "job_ids": job_ids}

        except Exception as e:
            logging.error(f"CV-Library scraping error: {e}")
            return {"scraped_count": 0, "status": "failed", "error": str(e)}

    def _normalize_job(self, job: Dict, campaign: dict) -> Dict:
        title = job.get("job_title") or job.get("title", "Unknown")
        company = job.get("company") or job.get("employer", "Unknown Company")
        description = job.get("job_description") or job.get("description", "")
        job_id = str(job.get("job_id") or job.get("id", ""))
        url = job.get("job_url") or job.get("url") or f"https://www.cv-library.co.uk/job/{job_id}"
        location = job.get("location") or job.get("town", "")

        salary_min = job.get("salary_from") or job.get("salary_min")
        salary_max = job.get("salary_to") or job.get("salary_max")
        salary_range = None
        if salary_min and salary_max:
            salary_range = f"£{int(salary_min):,} - £{int(salary_max):,}"
        elif salary_min:
            salary_range = f"£{int(salary_min):,}+"
        elif job.get("salary"):
            salary_range = str(job["salary"])

        remote_type = "remote" if "remote" in (title + description + location).lower() else "onsite"

        match_score, match_reasoning = score_job(title, description, campaign)

        return {
            "campaign_id": campaign["id"],
            "user_id": campaign["user_id"],
            "source": "cvlibrary",
            "external_job_id": job_id or url,
            "job_title": title,
            "company_name": company,
            "company_logo_url": None,
            "location": location,
            "remote_type": remote_type,
            "salary_range": salary_range,
            "job_url": url,
            "job_description": description,
            "status": "PENDING_REVIEW",
            "match_score": match_score,
            "match_reasoning": match_reasoning,
            "job_posted_at": job.get("date_posted") or job.get("posted_date") or None,
        }
