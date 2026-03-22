import logging
import httpx
from typing import Dict, Optional
from .scoring import score_job

# Jobicy free public API — no key required.
# Specialises in remote tech, programming, and AI/ML roles.
# Docs: https://jobicy.com/jobs-rss-feed

class JobicyScraper:
    API_URL = "https://jobicy.com/api/v2/remote-jobs"

    # Map campaign keywords → Jobicy industry filter
    _INDUSTRY_MAP = {
        "engineer": "engineering", "developer": "engineering", "dev": "engineering",
        "fullstack": "engineering", "backend": "engineering", "frontend": "engineering",
        "python": "engineering", "javascript": "engineering", "typescript": "engineering",
        "react": "engineering", "node": "engineering", "java": "engineering",
        "devops": "engineering", "cloud": "engineering", "infrastructure": "engineering",
        "data": "data-science", "ml": "data-science", "ai": "data-science",
        "machine learning": "data-science", "deep learning": "data-science",
        "analyst": "data-science", "science": "data-science",
        "design": "design", "ux": "design", "ui": "design",
        "marketing": "marketing", "seo": "marketing",
        "product": "product", "manager": "management",
        "sales": "sales", "finance": "finance", "legal": "legal",
        "writing": "writing", "content": "writing", "copy": "writing",
        "qa": "qa", "test": "qa",
        "support": "support", "customer": "support",
    }

    def __init__(self, supabase_client):
        self.supabase = supabase_client

    def _pick_industry(self, keywords: str) -> Optional[str]:
        kw = keywords.lower()
        for term, industry in self._INDUSTRY_MAP.items():
            if term in kw:
                return industry
        return None

    async def scrape_jobs_for_campaign(self, campaign: dict) -> dict:
        logging.info(f"Starting Jobicy scrape for campaign: {campaign['id']}")

        prefs = campaign.get("job_preferences", {})
        keywords = prefs.get("keywords", "")
        arrangement = (prefs.get("work_arrangement") or "").lower()
        max_results = campaign.get("max_results_per_run", 50)

        # Jobicy is remote-only
        if arrangement and arrangement != "remote":
            return {"scraped_count": 0, "status": "success"}

        params: dict = {"count": min(max_results, 50)}

        # Use the most specific keyword as the tag search
        tag = keywords.split(",")[0].strip() if keywords else ""
        if tag:
            params["tag"] = tag

        industry = self._pick_industry(keywords)
        if industry:
            params["industry"] = industry

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(self.API_URL, params=params)
                resp.raise_for_status()
                data = resp.json()

            jobs = data.get("jobs", [])
            scraped_count = 0

            for job in jobs[:max_results]:
                normalized = self._normalize_job(job, campaign)
                try:
                    self.supabase.table("inbox_items").insert(normalized).execute()
                    scraped_count += 1
                except Exception:
                    continue  # duplicate

            logging.info(f"Jobicy scraped {scraped_count} jobs for campaign {campaign['id']}")
            return {"scraped_count": scraped_count, "status": "success"}

        except Exception as e:
            logging.error(f"Jobicy scraping error: {e}")
            return {"scraped_count": 0, "status": "failed", "error": str(e)}

    def _normalize_job(self, job: Dict, campaign: dict) -> Dict:
        title = job.get("jobTitle", "Unknown")
        company = job.get("companyName", "Unknown Company")
        description = job.get("jobDescription", "")
        url = job.get("url", "")
        location = job.get("jobGeo", "Remote")
        salary = job.get("annualSalaryMin") or job.get("annualSalaryMax")
        salary_range = None
        if job.get("annualSalaryMin") and job.get("annualSalaryMax"):
            cur = job.get("salaryCurrency", "$")
            salary_range = f"{cur}{int(job['annualSalaryMin']):,} - {cur}{int(job['annualSalaryMax']):,}"
        elif salary:
            cur = job.get("salaryCurrency", "$")
            salary_range = f"{cur}{int(salary):,}+"

        match_score, match_reasoning = score_job(title, description, campaign)

        return {
            "campaign_id": campaign["id"],
            "user_id": campaign["user_id"],
            "source": "jobicy",
            "external_job_id": str(job.get("id", url)),
            "job_title": title,
            "company_name": company,
            "company_logo_url": job.get("companyLogo"),
            "location": location,
            "remote_type": "remote",
            "salary_range": salary_range,
            "job_url": url,
            "job_description": description,
            "status": "PENDING_REVIEW",
            "match_score": match_score,
            "match_reasoning": match_reasoning,
            "job_posted_at": job.get("pubDate") or None,
        }
