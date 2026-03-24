import logging
import httpx
import os
import base64
from typing import Dict, Optional
from .scoring import score_job

# Reed.co.uk API — free registration at https://www.reed.co.uk/developers/jobseeker
# Massive UK job board; strongest source for UK contract and permanent roles.
# Auth: HTTP Basic with API key as username, empty password.

class ReedScraper:
    API_URL = "https://www.reed.co.uk/api/1.0/search"

    def __init__(self, supabase_client):
        self.supabase = supabase_client
        self.api_key = os.environ.get("REED_API_KEY", "")

    async def scrape_jobs_for_campaign(self, campaign: dict) -> dict:
        if not self.api_key:
            logging.warning("REED_API_KEY not configured — skipping Reed")
            return {"scraped_count": 0, "status": "skipped", "error": "Reed API key missing"}

        logging.info(f"Starting Reed scrape for campaign: {campaign['id']}")

        prefs = campaign.get("job_preferences", {})
        keywords = prefs.get("keywords", "")
        location = prefs.get("location", "")
        arrangement = (prefs.get("work_arrangement") or "").lower()
        max_results = campaign.get("max_results_per_run", 50)

        params: dict = {
            "resultsToTake": min(max_results, 100),
            "resultsToSkip": 0,
        }
        if keywords:
            params["keywords"] = keywords
        if location and "remote" not in location.lower():
            params["locationName"] = location
        if arrangement == "remote":
            params["distanceFromLocation"] = 0
            params["keywords"] = f"{keywords} remote".strip()

        # Salary minimum
        salary_pref = prefs.get("salary", "")
        if salary_pref:
            import re
            num = re.search(r"[\d,]+", salary_pref.replace(",", ""))
            if num:
                try:
                    params["minimumSalary"] = int(num.group().replace(",", ""))
                except ValueError:
                    pass

        # Reed Basic auth: api_key as username, empty password
        token = base64.b64encode(f"{self.api_key}:".encode()).decode()
        headers = {"Authorization": f"Basic {token}"}

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(self.API_URL, params=params, headers=headers)
                resp.raise_for_status()
                data = resp.json()

            jobs = data.get("results", [])
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

            logging.info(f"Reed scraped {scraped_count} jobs for campaign {campaign['id']}")
            return {"scraped_count": scraped_count, "status": "success", "job_ids": job_ids}

        except Exception as e:
            logging.error(f"Reed scraping error: {e}")
            return {"scraped_count": 0, "status": "failed", "error": str(e)}

    def _normalize_job(self, job: Dict, campaign: dict) -> Dict:
        title = job.get("jobTitle", "Unknown")
        company = job.get("employerName", "Unknown Company")
        description = job.get("jobDescription", "")
        job_id = str(job.get("jobId", ""))
        url = f"https://www.reed.co.uk/jobs/{job_id}" if job_id else job.get("jobUrl", "")
        location = job.get("locationName", "")

        salary_min = job.get("minimumSalary")
        salary_max = job.get("maximumSalary")
        salary_range = None
        if salary_min and salary_max:
            salary_range = f"£{int(salary_min):,} - £{int(salary_max):,}"
        elif salary_min:
            salary_range = f"£{int(salary_min):,}+"

        remote_type = "remote" if job.get("locationName", "").lower() == "remote" else "onsite"

        match_score, match_reasoning = score_job(title, description, campaign)

        return {
            "campaign_id": campaign["id"],
            "user_id": campaign["user_id"],
            "source": "reed",
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
            "job_posted_at": job.get("date") or None,
        }
