import logging
import httpx
import os
from typing import Dict, Optional
from .scoring import score_job

class SerperScraper:
    """
    Uses Serper's /search endpoint to find job listings via Google.
    The /jobs endpoint requires a higher-tier Serper plan and is not available
    on the current key. /search is available on all tiers and returns organic
    results from LinkedIn, Indeed, Glassdoor etc. when queried correctly.
    """
    def __init__(self, supabase_client):
        self.supabase = supabase_client
        self.api_url = "https://google.serper.dev/search"
        self.api_key = os.environ.get("SERPER_API_KEY")

    async def scrape_jobs_for_campaign(self, campaign: dict) -> dict:
        if not self.api_key:
            logging.error("SERPER_API_KEY not configured")
            return {"scraped_count": 0, "status": "failed", "error": "Serper API key missing"}

        logging.info(f"Starting Serper (Google Search) scrape for campaign: {campaign['id']}")

        prefs = campaign.get("job_preferences", {})
        keywords = prefs.get("keywords", "Software Engineer")
        location = prefs.get("location", "Remote")
        job_type = (prefs.get("job_type") or "").lower()            # "full-time" | "part-time"
        arrangement = (prefs.get("work_arrangement") or "").lower() # "remote" | "hybrid" | "onsite"

        # Build query — append job_type and arrangement to narrow Google results at source
        query_parts = [keywords, location, "jobs"]
        if job_type:
            query_parts.append(job_type)
        if arrangement:
            query_parts.append(arrangement)
        query = " ".join(query_parts)

        # Infer country code from location for better geo-targeting
        location_lower = location.lower()
        if any(x in location_lower for x in ["uk", "scotland", "england", "london", "edinburgh", "glasgow"]):
            gl = "gb"
        elif any(x in location_lower for x in ["canada", "toronto", "vancouver"]):
            gl = "ca"
        elif any(x in location_lower for x in ["australia", "sydney", "melbourne"]):
            gl = "au"
        elif "remote" in location_lower:
            gl = "gb"  # default to GB for remote (user is UK-based)
        else:
            gl = "us"

        # tbs = time-based search: qdr:d (24h), qdr:w (7d), qdr:m (30d)
        posted_within_days = prefs.get("posted_within_days")
        tbs = None
        if posted_within_days:
            d = int(posted_within_days)
            tbs = "qdr:d" if d <= 1 else "qdr:w" if d <= 7 else "qdr:m"

        payload: dict = {
            "q": query,
            "gl": gl,
            "hl": "en",
            "num": min(campaign.get("max_results_per_run", 50), 100)
        }
        if tbs:
            payload["tbs"] = tbs

        headers = {
            "X-API-KEY": self.api_key,
            "Content-Type": "application/json"
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(self.api_url, headers=headers, json=payload)
                resp.raise_for_status()
                data = resp.json()

                organic = data.get("organic", [])
                if not organic:
                    logging.warning(f"Serper returned 0 organic results for query: {query!r} gl={gl}")

                # Filter to results that look like job listings (from known job boards)
                job_boards = {"linkedin.com", "indeed.com", "glassdoor.com", "reed.co.uk",
                              "totaljobs.com", "cwjobs.co.uk", "jobsite.co.uk", "monster.co.uk",
                              "ziprecruiter.com", "greenhouse.io", "lever.co", "workable.com"}

                scraped_count = 0
                max_results = campaign.get("max_results_per_run", 50)

                for result in organic:
                    if scraped_count >= max_results:
                        break
                    link = result.get("link", "")
                    # Only include results from recognised job boards
                    if not any(board in link for board in job_boards):
                        continue
                    normalized = self._normalize_result(result, campaign)
                    try:
                        self.supabase.table("inbox_items").insert(normalized).execute()
                        scraped_count += 1
                    except Exception:
                        continue  # duplicate external_job_id

                logging.info(f"Serper scraped {scraped_count} job board results for campaign {campaign['id']}")
                return {"scraped_count": scraped_count, "status": "success"}

        except Exception as e:
            logging.error(f"Serper scraping error: {e}")
            return {"scraped_count": 0, "status": "failed", "error": str(e)}

    def _normalize_result(self, result: Dict, campaign: dict) -> Dict:
        link = result.get("link", "")
        snippet = result.get("snippet", "")
        title = result.get("title", "Unknown")

        # Infer source from domain
        source_label = "google-jobs"
        for board in ["linkedin", "indeed", "glassdoor", "reed", "totaljobs", "ziprecruiter"]:
            if board in link:
                source_label = board
                break

        remote_type = "remote" if "remote" in (snippet + title + link).lower() else "onsite"

        match_score, match_reasoning = score_job(title, snippet, campaign)
        return {
            "campaign_id": campaign["id"],
            "user_id": campaign["user_id"],
            "source": source_label,
            "external_job_id": link,
            "job_title": title,
            "company_name": result.get("displayedLink", "Unknown Company"),
            "company_logo_url": None,
            "location": campaign.get("job_preferences", {}).get("location", "Unknown"),
            "remote_type": remote_type,
            "salary_range": self._extract_salary(snippet),
            "job_url": link,
            "job_description": snippet,
            "status": "PENDING_REVIEW",
            "match_score": match_score,
            "match_reasoning": match_reasoning,
        }

    def _extract_salary(self, text: str) -> Optional[str]:
        """Very light salary extraction from snippet text."""
        import re
        # Match patterns like £40,000, $80k, €50K-€70K
        match = re.search(r'[\$£€]\s?[\d,]+[kK]?\s*[-–]\s*[\$£€]?\s?[\d,]+[kK]?|[\$£€]\s?[\d,]+[kK]', text)
        return match.group(0).strip() if match else None
