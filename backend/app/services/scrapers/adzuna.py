import logging
import httpx
import os
from typing import Dict, Optional
from .scoring import score_job

# Adzuna free public API — 250 requests/day, 50 results/request, no per-result cost.
# Register at https://developer.adzuna.com/ to get an app_id and app_key.
# UK coverage is excellent; also supports us, ca, au, de, fr, nl, sg, za, in, br, nz, pl, ru.

class AdzunaScraper:
    API_BASE = "https://api.adzuna.com/v1/api/jobs"

    _COUNTRY_MAP = {
        "uk": "gb", "gb": "gb", "united kingdom": "gb",
        "scotland": "gb", "england": "gb", "wales": "gb",
        "edinburgh": "gb", "glasgow": "gb", "london": "gb", "manchester": "gb",
        "us": "us", "usa": "us", "united states": "us",
        "canada": "ca", "toronto": "ca", "vancouver": "ca",
        "australia": "au", "sydney": "au", "melbourne": "au",
        "germany": "de", "berlin": "de", "munich": "de",
        "france": "fr", "paris": "fr",
        "remote": "gb",  # default remote to GB since user is UK-based
    }

    def __init__(self, supabase_client):
        self.supabase = supabase_client
        self.app_id = os.environ.get("ADZUNA_APP_ID", "")
        self.app_key = os.environ.get("ADZUNA_APP_KEY", "")

    def _country_code(self, location: str) -> str:
        loc = location.lower()
        for key, code in self._COUNTRY_MAP.items():
            if key in loc:
                return code
        return "gb"  # default to GB

    async def scrape_jobs_for_campaign(self, campaign: dict) -> dict:
        if not self.app_id or not self.app_key:
            logging.warning("ADZUNA_APP_ID / ADZUNA_APP_KEY not configured — skipping Adzuna")
            return {"scraped_count": 0, "status": "skipped", "error": "Adzuna credentials missing"}

        logging.info(f"Starting Adzuna scrape for campaign: {campaign['id']}")

        prefs = campaign.get("job_preferences", {})
        keywords = prefs.get("keywords", "")
        location = prefs.get("location", "")
        arrangement = (prefs.get("work_arrangement") or "").lower()
        max_results = campaign.get("max_results_per_run", 50)
        country = self._country_code(location)

        params: dict = {
            "app_id": self.app_id,
            "app_key": self.app_key,
            "results_per_page": min(max_results, 50),
            "what": keywords,
            "sort_by": "date",
            "content-type": "application/json",
        }

        # Location: use the city/region part of the preference
        if location and "remote" not in location.lower():
            params["where"] = location

        # Work arrangement filter
        if arrangement == "remote":
            params["what"] = f"{keywords} remote"
        elif arrangement == "onsite":
            params["what"] = f"{keywords} onsite"

        # Salary minimum filter
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
                resp = await client.get(
                    f"{self.API_BASE}/{country}/search/1",
                    params=params,
                )
                resp.raise_for_status()
                data = resp.json()

            jobs = data.get("results", [])
            scraped_count = 0
            job_ids: list[str] = []

            for job in jobs:
                normalized = self._normalize_job(job, campaign)
                try:
                    res = self.supabase.table("inbox_items").insert(normalized).execute()
                    scraped_count += 1
                    if res.data and res.data[0].get("id"):
                        job_ids.append(res.data[0]["id"])
                except Exception:
                    continue  # duplicate external_job_id

            logging.info(f"Adzuna scraped {scraped_count} jobs for campaign {campaign['id']}")
            return {"scraped_count": scraped_count, "status": "success", "job_ids": job_ids}

        except Exception as e:
            logging.error(f"Adzuna scraping error: {e}")
            return {"scraped_count": 0, "status": "failed", "error": str(e)}

    def _normalize_job(self, job: Dict, campaign: dict) -> Dict:
        title = job.get("title", "Unknown")
        description = job.get("description", "")
        company = (job.get("company") or {}).get("display_name", "Unknown Company")
        location_obj = job.get("location") or {}
        location_str = location_obj.get("display_name", "")

        redirect_url = job.get("redirect_url", "")
        external_id = str(job.get("id", redirect_url))

        salary_min = job.get("salary_min")
        salary_max = job.get("salary_max")
        salary_range = None
        if salary_min and salary_max:
            salary_range = f"£{int(salary_min):,} - £{int(salary_max):,}"
        elif salary_min:
            salary_range = f"£{int(salary_min):,}+"

        remote_type = "remote" if "remote" in (title + description).lower() else "onsite"

        match_score, match_reasoning = score_job(title, description, campaign)

        job_posted_at = job.get("created") or None  # ISO string from Adzuna

        return {
            "campaign_id": campaign["id"],
            "user_id": campaign["user_id"],
            "source": "adzuna",
            "external_job_id": external_id,
            "job_title": title,
            "company_name": company,
            "company_logo_url": None,
            "location": location_str,
            "remote_type": remote_type,
            "salary_range": salary_range,
            "job_url": redirect_url,
            "job_description": description,
            "status": "PENDING_REVIEW",
            "match_score": match_score,
            "match_reasoning": match_reasoning,
            "job_posted_at": job_posted_at,
        }
