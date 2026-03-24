import logging
import httpx
import os
from typing import Dict
from .scoring import score_job

# TotalJobs API — part of the Stepstone Group.
# Register at https://www.totaljobs.com/recruiting/advertise/jobs-api
# or via their partner programme. Free tier available for job seekers / aggregators.
# Auth: API key in the Authorization header as Bearer token.
# Endpoint: https://api.totaljobs.com/v2/jobs

class TotalJobsScraper:
    API_URL = "https://api.totaljobs.com/v2/jobs"

    def __init__(self, supabase_client):
        self.supabase = supabase_client
        self.api_key = os.environ.get("TOTALJOBS_API_KEY", "")

    async def scrape_jobs_for_campaign(self, campaign: dict) -> dict:
        if not self.api_key:
            logging.warning("TOTALJOBS_API_KEY not configured — skipping TotalJobs")
            return {"scraped_count": 0, "status": "skipped", "error": "TotalJobs API key missing"}

        logging.info(f"Starting TotalJobs scrape for campaign: {campaign['id']}")

        prefs = campaign.get("job_preferences", {})
        keywords = prefs.get("keywords", "")
        location = prefs.get("location", "")
        arrangement = (prefs.get("work_arrangement") or "").lower()
        max_results = campaign.get("max_results_per_run", 50)

        params: dict = {
            "keywords": keywords,
            "take": min(max_results, 100),
            "skip": 0,
            "sort": "date",
        }

        if location and "remote" not in location.lower():
            params["location"] = location
            params["distance"] = 30  # miles

        if arrangement == "remote":
            params["keywords"] = f"{keywords} remote".strip()

        # Salary minimum
        salary_pref = prefs.get("salary", "")
        if salary_pref:
            import re
            num = re.search(r"[\d,]+", salary_pref.replace(",", ""))
            if num:
                try:
                    params["salaryMin"] = int(num.group().replace(",", ""))
                except ValueError:
                    pass

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(self.API_URL, params=params, headers=headers)
                resp.raise_for_status()
                data = resp.json()

            jobs = data.get("jobs", data.get("results", data if isinstance(data, list) else []))
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

            logging.info(f"TotalJobs scraped {scraped_count} jobs for campaign {campaign['id']}")
            return {"scraped_count": scraped_count, "status": "success", "job_ids": job_ids}

        except Exception as e:
            logging.error(f"TotalJobs scraping error: {e}")
            return {"scraped_count": 0, "status": "failed", "error": str(e)}

    def _normalize_job(self, job: Dict, campaign: dict) -> Dict:
        title = job.get("jobTitle") or job.get("title", "Unknown")
        company = job.get("company") or job.get("employer") or job.get("companyName", "Unknown Company")
        description = job.get("jobDescription") or job.get("description", "")
        job_id = str(job.get("jobId") or job.get("id", ""))
        url = job.get("jobUrl") or job.get("url") or f"https://www.totaljobs.com/job/{job_id}"
        location = job.get("location") or job.get("locationName", "")

        salary_min = job.get("salaryMin") or job.get("minimumSalary")
        salary_max = job.get("salaryMax") or job.get("maximumSalary")
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
            "source": "totaljobs",
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
            "job_posted_at": job.get("datePosted") or job.get("date") or None,
        }
