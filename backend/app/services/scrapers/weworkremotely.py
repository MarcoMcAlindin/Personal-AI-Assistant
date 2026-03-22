import logging
import feedparser
from typing import Dict, Optional, List
from datetime import datetime
import time

class WeWorkRemotelyScraper:
    def __init__(self, supabase_client):
        self.supabase = supabase_client
        # WWR feed for programming jobs
        self.feed_url = "https://weworkremotely.com/categories/remote-programming-jobs.rss"
        
    async def scrape_jobs_for_campaign(self, campaign: dict) -> dict:
        """
        Executes a background search query against WeWorkRemotely RSS feed for a campaign.
        Saves the results directly to Supabase inbox_items.
        """
        logging.info(f"Starting WeWorkRemotely scrape for campaign: {campaign['id']}")
        
        try:
            # Parse the RSS feed
            # feedparser blocks but it's usually fast enough. In a heavily loaded system, 
            # we would use httpx.get() then feedparser.parse()
            feed = feedparser.parse(self.feed_url)
            
            scraped_count = 0
            max_results = campaign.get("max_results_per_run", 50)
            
            for entry in feed.entries:
                if scraped_count >= max_results:
                    break
                    
                normalized = self._normalize_job(entry, campaign)
                # Insert into inbox items
                self.supabase.table("inbox_items").insert(normalized).execute()
                scraped_count += 1
            
            return {"scraped_count": scraped_count, "status": "success"}

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
            
        return {
            "campaign_id": campaign['id'],
            "user_id": campaign['user_id'],
            "source": "weworkremotely",
            "external_job_id": entry.get("id", entry.get("link", "")),
            "job_title": job_title,
            "company_name": company_name,
            "company_logo_url": None, # WWR RSS doesn't provide it reliably
            "location": "Anywhere", # Remote by default
            "remote_type": "remote",
            "salary_range": None, # Not usually cleanly provided in WWR RSS
            "job_url": entry.get("link", ""),
            "job_description": entry.get("description", ""),
            "status": "PENDING_REVIEW",
            "match_score": 0.8, # Placeholder until semantic matching
            "match_reasoning": "Sourced from WeWorkRemotely remote programming feed."
        }
