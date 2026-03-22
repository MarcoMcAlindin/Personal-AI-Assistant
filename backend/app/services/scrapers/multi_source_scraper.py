import logging
import asyncio
from typing import Dict, List
from .weworkremotely import WeWorkRemotelyScraper
from .serper import SerperScraper
from .crustdata import CrustdataScraper
from .proxycurl import ProxycurlScraper

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
        Aggregates results and returns a summary.
        """
        logging.info(f"Starting MultiSourceScraper for campaign: {campaign['id']}")
        
        # In a real app, we might filter scrapers based on campaign.search_sources
        # For now, we run all that are configured.
        
        tasks = [scraper.scrape_jobs_for_campaign(campaign) for scraper in self.scrapers]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        total_scraped = 0
        errors = []
        
        for idx, res in enumerate(results):
            if isinstance(res, Exception):
                errors.append(f"Scraper {idx} failed: {str(res)}")
            elif res.get("status") == "failed":
                errors.append(f"Scraper {idx} returned error: {res.get('error')}")
            else:
                total_scraped += res.get("scraped_count", 0)
        
        return {
            "scraped_count": total_scraped,
            "status": "success" if not errors else "partial_success",
            "errors": errors if errors else None
        }
