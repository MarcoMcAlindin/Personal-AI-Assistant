import logging
import asyncio
from typing import Dict, List
from datetime import datetime, timezone
from .weworkremotely import WeWorkRemotelyScraper
from .serper import SerperScraper
from .crustdata import CrustdataScraper
from .proxycurl import ProxycurlScraper

# Modified: 2026-03-22
# What: Added _write_scrape_log() to persist execution evidence to the scrape_logs table after
#       each scraper run. Changed error messages to use scraper class names instead of index numbers.
# Why: The scrape_logs table existed in migrations but was never written to, causing the Job Engine
#      to appear as a "Ghost feature" with no verifiable execution history (flagged in Rule 18/31 audit).

class MultiSourceScraper:
    def __init__(self, supabase_client):
        self.supabase = supabase_client
        self.scrapers = [
            WeWorkRemotelyScraper(supabase_client),
            SerperScraper(supabase_client),
            CrustdataScraper(supabase_client),
            ProxycurlScraper(supabase_client)
        ]

    async def scrape_jobs_for_campaign(self, campaign: dict) -> Dict:
        """
        Runs all registered scrapers in parallel for the given campaign.
        Aggregates results, writes execution evidence to scrape_logs, and returns a summary.
        """
        logging.info(f"Starting MultiSourceScraper for campaign: {campaign['id']}")

        tasks = [scraper.scrape_jobs_for_campaign(campaign) for scraper in self.scrapers]
        started_at = datetime.now(timezone.utc)
        results = await asyncio.gather(*tasks, return_exceptions=True)
        completed_at = datetime.now(timezone.utc)

        total_scraped = 0
        errors = []

        for idx, res in enumerate(results):
            scraper_name = type(self.scrapers[idx]).__name__

            if isinstance(res, Exception):
                error_msg = str(res)
                errors.append(f"{scraper_name} raised exception: {error_msg}")
                logging.error(f"{scraper_name} raised exception: {error_msg}")
                self._write_scrape_log(campaign, scraper_name, 0, started_at, completed_at, error_msg)
            elif res.get("status") == "failed":
                error_msg = res.get("error", "unknown error")
                errors.append(f"{scraper_name} returned error: {error_msg}")
                logging.error(f"{scraper_name} returned error: {error_msg}")
                self._write_scrape_log(campaign, scraper_name, 0, started_at, completed_at, error_msg)
            else:
                count = res.get("scraped_count", 0)
                total_scraped += count
                self._write_scrape_log(campaign, scraper_name, count, started_at, completed_at, None)

        return {
            "scraped_count": total_scraped,
            "status": "success" if not errors else "partial_success",
            "errors": errors if errors else None
        }

    def _write_scrape_log(
        self,
        campaign: dict,
        source: str,
        count: int,
        started_at: datetime,
        completed_at: datetime,
        error: str
    ):
        """Write execution evidence to the scrape_logs table."""
        if not self.supabase:
            return
        duration_ms = int((completed_at - started_at).total_seconds() * 1000)
        prefs = campaign.get("job_preferences", {})
        search_query = prefs.get("keywords") or campaign.get("name", "unknown")
        try:
            self.supabase.table("scrape_logs").insert({
                "campaign_id": campaign["id"],
                "source": source,
                "search_query": search_query,
                "results_count": count,
                "duration_ms": duration_ms,
                "started_at": started_at.isoformat(),
                "completed_at": completed_at.isoformat(),
                "error": error,
            }).execute()
        except Exception as e:
            logging.warning(f"Failed to write scrape_log for {source}: {e}")
