import logging
import asyncio
import feedparser
from typing import Dict, Optional, List
from datetime import datetime
import time
from .scoring import score_job

# Modified: 2026-03-22
# What: Wrapped feedparser.parse() in run_in_executor to prevent blocking the asyncio event loop.
#       Added try/except around inbox_items insert to handle duplicate external_job_id gracefully.
# Why: feedparser is synchronous I/O; calling it directly in an async def blocks all other coroutines
#      in asyncio.gather. Duplicate inserts aborted the loop silently on repeat scraper runs.

class WeWorkRemotelyScraper:
    # All WWR category RSS feeds
    _FEEDS = {
        "programming":   "https://weworkremotely.com/categories/remote-programming-jobs.rss",
        "devops":        "https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss",
        "design":        "https://weworkremotely.com/categories/remote-design-jobs.rss",
        "marketing":     "https://weworkremotely.com/categories/remote-marketing-jobs.rss",
        "sales":         "https://weworkremotely.com/categories/remote-sales-jobs.rss",
        "product":       "https://weworkremotely.com/categories/remote-product-jobs.rss",
        "management":    "https://weworkremotely.com/categories/remote-management-executive-jobs.rss",
        "finance":       "https://weworkremotely.com/categories/remote-finance-legal-jobs.rss",
        "writing":       "https://weworkremotely.com/categories/remote-writing-editing-jobs.rss",
        "data":          "https://weworkremotely.com/categories/remote-data-science-ai-statistics-jobs.rss",
        "qa":            "https://weworkremotely.com/categories/remote-qa-jobs.rss",
        "all":           "https://weworkremotely.com/remote-jobs.rss",
    }
    _KEYWORD_MAP = {
        "devops": "devops", "sysadmin": "devops", "infrastructure": "devops", "cloud": "devops",
        "design": "design", "ux": "design", "ui": "design", "figma": "design",
        "marketing": "marketing", "seo": "marketing", "content": "marketing", "growth": "marketing",
        "sales": "sales", "account": "sales", "revenue": "sales", "bdr": "sales", "sdr": "sales",
        "product": "product", "pm": "product", "product manager": "product",
        "cto": "management", "ceo": "management", "vp": "management", "director": "management", "head of": "management",
        "finance": "finance", "accountant": "finance", "legal": "finance", "lawyer": "finance",
        "writer": "writing", "editor": "writing", "copywriter": "writing",
        "data": "data", "analyst": "data", "machine learning": "data", "ml": "data", "ai": "data",
        "qa": "qa", "test": "qa", "quality": "qa",
    }

    def __init__(self, supabase_client):
        self.supabase = supabase_client

    def _pick_feed(self, keywords: str) -> str:
        """Pick the most relevant WWR RSS feed based on campaign keywords."""
        kw_lower = keywords.lower()
        for keyword, category in self._KEYWORD_MAP.items():
            if keyword in kw_lower:
                return self._FEEDS[category]
        # Default to programming (largest category) — fallback to all if clearly non-tech
        return self._FEEDS["programming"]

    async def scrape_jobs_for_campaign(self, campaign: dict) -> dict:
        """
        Executes a background search query against WeWorkRemotely RSS feed for a campaign.
        Saves the results directly to Supabase inbox_items.
        """
        logging.info(f"Starting WeWorkRemotely scrape for campaign: {campaign['id']}")

        try:
            prefs = campaign.get("job_preferences", {})
            keywords = prefs.get("keywords", "")
            job_type = (prefs.get("job_type") or "").lower()
            arrangement = (prefs.get("work_arrangement") or "").lower()

            # WWR is remote-only — skip if onsite/hybrid explicitly requested
            if arrangement and arrangement != "remote":
                return {"scraped_count": 0, "status": "success"}

            feed_url = self._pick_feed(keywords)

            # feedparser.parse is synchronous blocking I/O — run in executor to avoid
            # stalling the event loop when called inside asyncio.gather.
            loop = asyncio.get_event_loop()
            feed = await loop.run_in_executor(None, feedparser.parse, feed_url)

            scraped_count = 0
            job_ids: list[str] = []
            max_results = campaign.get("max_results_per_run", 50)

            for entry in feed.entries:
                if scraped_count >= max_results:
                    break
                # Client-side job_type filter
                if job_type:
                    combined = f"{entry.get('title','')} {entry.get('description','')}".lower()
                    if job_type not in combined and job_type.replace("-", " ") not in combined:
                        continue
                normalized = self._normalize_job(entry, campaign)
                try:
                    res = self.supabase.table("inbox_items").insert(normalized).execute()
                    scraped_count += 1
                    if res.data and res.data[0].get("id"):
                        job_ids.append(res.data[0]["id"])
                except Exception:
                    # Likely a duplicate external_job_id — skip silently.
                    continue

            return {"scraped_count": scraped_count, "status": "success", "job_ids": job_ids}

        except Exception as e:
            logging.error(f"WeWorkRemotely Scraping error: {e}")
            return {"scraped_count": 0, "status": "failed", "error": str(e)}

    def _normalize_job(self, entry: Dict, campaign: dict) -> Dict:
        """Convert WWR RSS schema to inbox_items schema."""
        # WWR titles are usually "Company Name: Job Title"
        title_parts = entry.get("title", "Unknown").split(":", 1)
        if len(title_parts) == 2:
            company_name = title_parts[0].strip()
            job_title = title_parts[1].strip()
        else:
            company_name = "Unknown Company"
            job_title = entry.get("title", "Unknown")

        description = entry.get("description", "")
        match_score, match_reasoning = score_job(job_title, description, campaign)

        # feedparser parses RSS <pubDate> into a time.struct_time in entry.published_parsed
        job_posted_at = None
        if entry.get("published_parsed"):
            try:
                from datetime import timezone
                job_posted_at = datetime.fromtimestamp(
                    time.mktime(entry["published_parsed"]), tz=timezone.utc
                ).isoformat()
            except Exception:
                pass

        return {
            "campaign_id": campaign['id'],
            "user_id": campaign['user_id'],
            "source": "weworkremotely",
            "external_job_id": entry.get("id", entry.get("link", "")),
            "job_title": job_title,
            "company_name": company_name,
            "company_logo_url": None,
            "location": "Anywhere",
            "remote_type": "remote",
            "salary_range": None,
            "job_url": entry.get("link", ""),
            "job_description": description,
            "status": "PENDING_REVIEW",
            "match_score": match_score,
            "match_reasoning": match_reasoning,
            "job_posted_at": job_posted_at,
        }
