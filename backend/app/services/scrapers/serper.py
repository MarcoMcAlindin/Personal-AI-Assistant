import asyncio
import logging
import httpx
import os
from typing import Dict, Optional
from .scoring import score_job
from .url_validator import is_individual_job, validate_jobs_batch

# Non-job domains to skip in organic results
_NON_JOB_DOMAINS = {
    "wikipedia.org", "reddit.com", "quora.com", "medium.com",
    "youtube.com", "twitter.com", "facebook.com", "instagram.com",
    "stackoverflow.com", "github.com", "techcrunch.com", "forbes.com",
    "businessinsider.com", "theguardian.com", "bbc.co.uk", "bbc.com",
}

class SerperScraper:
    """
    Three parallel requests per scrape run:
      Q1 (/search) — broad job board organic: LinkedIn, Indeed, Reed, Glassdoor, etc.
      Q2 (/search) — targeted LinkedIn individual posts + ATS career pages
      Q3 (/jobs)   — Google Jobs structured panel (best quality; includes LinkedIn, Indeed)

    Q3 is the highest-quality source. Q1/Q2 are fallback/supplement.
    """
    SEARCH_URL = "https://google.serper.dev/search"
    JOBS_URL   = "https://google.serper.dev/jobs"

    def __init__(self, supabase_client):
        self.supabase = supabase_client
        self.api_key = os.environ.get("SERPER_API_KEY")

    async def scrape_jobs_for_campaign(self, campaign: dict) -> dict:
        if not self.api_key:
            logging.error("SERPER_API_KEY not configured")
            return {"scraped_count": 0, "status": "failed", "error": "Serper API key missing"}

        logging.info(f"Starting Serper scrape for campaign: {campaign['id']}")

        prefs = campaign.get("job_preferences", {})
        keywords  = prefs.get("keywords", "Software Engineer")
        location  = prefs.get("location", "Remote")
        job_type  = (prefs.get("job_type") or "").lower()
        arrangement = (prefs.get("work_arrangement") or "").lower()

        # Build the core search phrase
        query_parts = [keywords, location, "job"]
        if job_type:
            query_parts.append(job_type)
        if arrangement:
            query_parts.append(arrangement)
        query = " ".join(query_parts)

        # Geo targeting
        location_lower = location.lower()
        if any(x in location_lower for x in ["uk", "scotland", "england", "london", "edinburgh", "glasgow"]):
            gl = "gb"
        elif any(x in location_lower for x in ["canada", "toronto", "vancouver"]):
            gl = "ca"
        elif any(x in location_lower for x in ["australia", "sydney", "melbourne"]):
            gl = "au"
        elif "remote" in location_lower:
            gl = "gb"
        else:
            gl = "us"

        # Time filter
        posted_within_days = prefs.get("posted_within_days")
        tbs = None
        if posted_within_days:
            d = int(posted_within_days)
            tbs = "qdr:d" if d <= 1 else "qdr:w" if d <= 7 else "qdr:m"

        base: dict = {"gl": gl, "hl": "en"}
        if tbs:
            base["tbs"] = tbs

        headers = {"X-API-KEY": self.api_key, "Content-Type": "application/json"}

        # Q1: broad organic — job boards (Reed, Indeed, Glassdoor etc.)
        q1 = {**base, "q": f"{keywords} {location} jobs", "num": 10}
        # Q2: LinkedIn individual posts + ATS pages
        q2 = {**base,
              "q": (f'site:linkedin.com/jobs/view/ "{keywords}" OR '
                    f'("{keywords}" {location} (site:greenhouse.io OR site:lever.co OR site:workable.com OR site:jobs.ashbyhq.com))'),
              "num": 10}
        # Q3: Google Jobs structured panel — best quality
        q3 = {**base, "q": f"{keywords} {location}"}

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                r1, r2, r3 = await asyncio.gather(
                    client.post(self.SEARCH_URL, headers=headers, json=q1),
                    client.post(self.SEARCH_URL, headers=headers, json=q2),
                    client.post(self.JOBS_URL,   headers=headers, json=q3),
                    return_exceptions=True,
                )

            # ── Collect organic results (Q1 + Q2) ────────────────────────────
            organic: list[dict] = []
            for resp in (r1, r2):
                if isinstance(resp, Exception):
                    logging.warning(f"Serper organic query failed: {resp}")
                    continue
                try:
                    resp.raise_for_status()
                    organic.extend(resp.json().get("organic", []))
                except Exception as e:
                    logging.warning(f"Serper organic error: {e}")

            # ── Collect Google Jobs results (Q3) ─────────────────────────────
            google_jobs: list[dict] = []
            if not isinstance(r3, Exception):
                try:
                    r3.raise_for_status()
                    google_jobs = r3.json().get("jobs", [])
                    logging.info(f"Serper /jobs returned {len(google_jobs)} structured jobs")
                except Exception as e:
                    logging.warning(f"Serper /jobs error (plan may not include it): {e}")

            # ── Deduplicate organic by URL ────────────────────────────────────
            seen: set[str] = set()
            unique_organic = []
            for r in organic:
                url = r.get("link", "")
                if url and url not in seen:
                    seen.add(url)
                    unique_organic.append(r)

            logging.info(
                f"Serper raw: {len(unique_organic)} organic + {len(google_jobs)} Google Jobs"
            )

            max_results = campaign.get("max_results_per_run", 50)
            scraped_count = 0
            job_ids: list[str] = []

            # ── Insert Google Jobs first (structured, best quality) ───────────
            for job in google_jobs[:max_results]:
                normalized = self._normalize_google_job(job, campaign)
                if not normalized:
                    continue
                # Add to seen so organic pass doesn't double-insert same URL
                seen.add(normalized.get("job_url", ""))
                try:
                    res = self.supabase.table("inbox_items").insert(normalized).execute()
                    scraped_count += 1
                    if res.data and res.data[0].get("id"):
                        job_ids.append(res.data[0]["id"])
                except Exception:
                    continue  # duplicate

            # ── Filter organic with URL validator ─────────────────────────────
            candidates = []
            for result in unique_organic:
                link = result.get("link", "")
                if link in seen:
                    continue
                if any(d in link for d in _NON_JOB_DOMAINS):
                    continue
                ok, reason = is_individual_job(result.get("title", ""), link)
                if not ok:
                    logging.debug(f"Serper organic filtered: {reason}")
                    continue
                candidates.append(result)

            # ── Reachability check ────────────────────────────────────────────
            raw_for_validation = [
                {"title": r.get("title", ""), "url": r.get("link", ""), "_result": r}
                for r in candidates
            ]
            validated = await validate_jobs_batch(
                raw_for_validation, check_reachability=True, semaphore_limit=8,
            )
            remaining = max_results - scraped_count
            validated_results = [v["_result"] for v in validated][:remaining]

            for result in validated_results:
                normalized = self._normalize_result(result, campaign)
                try:
                    res = self.supabase.table("inbox_items").insert(normalized).execute()
                    scraped_count += 1
                    if res.data and res.data[0].get("id"):
                        job_ids.append(res.data[0]["id"])
                except Exception:
                    continue

            logging.info(
                f"Serper: {len(unique_organic)} organic → {len(candidates)} heuristic pass "
                f"→ {len(validated_results)} reachable | "
                f"{len(google_jobs)} Google Jobs | {scraped_count} total inserted"
            )
            return {"scraped_count": scraped_count, "status": "success", "job_ids": job_ids}

        except Exception as e:
            logging.error(f"Serper scraping error: {e}")
            return {"scraped_count": 0, "status": "failed", "error": str(e)}

    def _normalize_google_job(self, job: dict, campaign: dict) -> Optional[dict]:
        """Normalize a Google Jobs structured result (from Serper /jobs endpoint)."""
        title = job.get("title", "")
        company = job.get("company_name", "Unknown Company")
        location_str = job.get("location", "")
        description = job.get("description", "")
        via = job.get("via", "")  # e.g. "via LinkedIn", "via Indeed"

        # Best apply URL: first related link, then job_id-based Google URL
        apply_url = ""
        related = job.get("related_links", [])
        if related:
            apply_url = related[0].get("link", "")
        if not apply_url:
            job_id = job.get("job_id", "")
            apply_url = f"https://www.google.com/search?q={job_id}" if job_id else ""

        if not title or not apply_url:
            return None

        # Infer source label from "via" field
        source_label = "google-jobs"
        via_lower = via.lower()
        for board in ["linkedin", "indeed", "glassdoor", "reed", "totaljobs", "ziprecruiter", "adzuna"]:
            if board in via_lower:
                source_label = board
                break

        remote_type = "remote" if "remote" in (title + description + location_str).lower() else "onsite"

        # Parse salary from detected_extensions
        salary_range = None
        ext = job.get("detected_extensions", {})
        if ext.get("salary"):
            salary_range = ext["salary"]

        # Parse posted date
        job_posted_at = None
        posted = ext.get("posted_at", "") or job.get("date", "")
        if posted:
            from datetime import datetime, timezone, timedelta
            import re
            m = re.search(r"(\d+)\s+(hour|day|week|month)", posted)
            if m:
                n, unit = int(m.group(1)), m.group(2)
                delta = {"hour": timedelta(hours=n), "day": timedelta(days=n),
                         "week": timedelta(weeks=n), "month": timedelta(days=n*30)}.get(unit)
                if delta:
                    job_posted_at = (datetime.now(timezone.utc) - delta).isoformat()

        match_score, match_reasoning = score_job(title, description, campaign)

        return {
            "campaign_id": campaign["id"],
            "user_id": campaign["user_id"],
            "source": source_label,
            "external_job_id": apply_url,
            "job_title": title,
            "company_name": company,
            "company_logo_url": job.get("thumbnail"),
            "location": location_str,
            "remote_type": remote_type,
            "salary_range": salary_range,
            "job_url": apply_url,
            "job_description": description,
            "status": "PENDING_REVIEW",
            "match_score": match_score,
            "match_reasoning": match_reasoning,
            "job_posted_at": job_posted_at,
        }

    def _normalize_result(self, result: Dict, campaign: dict) -> Dict:
        """Normalize a Google organic search result."""
        link = result.get("link", "")
        snippet = result.get("snippet", "")
        title = result.get("title", "Unknown")

        source_label = "google-jobs"
        for board in ["linkedin", "indeed", "glassdoor", "reed", "totaljobs", "ziprecruiter", "adzuna"]:
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
        import re
        match = re.search(
            r'[\$£€]\s?[\d,]+[kK]?\s*[-–]\s*[\$£€]?\s?[\d,]+[kK]?|[\$£€]\s?[\d,]+[kK]',
            text
        )
        return match.group(0).strip() if match else None
