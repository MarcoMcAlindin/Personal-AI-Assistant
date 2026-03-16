import feedparser
import httpx
from typing import List, Dict
import os


class FeedService:
    def __init__(self):
        self.tech_feeds = [
            "https://venturebeat.com/category/ai/feed/",
            "https://techcrunch.com/category/artificial-intelligence/feed/"
        ]

    async def get_tech_news(self) -> List[Dict]:
        """Aggregate AI & Tech news from RSS feeds."""
        all_articles = []
        for url in self.tech_feeds:
            try:
                feed = feedparser.parse(url)
                for entry in feed.entries[:5]:
                    all_articles.append({
                        "title": entry.title,
                        "url": entry.link,
                        "source": feed.feed.title,
                        "published_at": entry.get('published', ''),
                        "description": entry.get('summary', '')[:200],
                    })
            except Exception as e:
                print(f"Error parsing RSS {url}: {e}")
        return all_articles

    async def get_concerts(self) -> List[Dict]:
        """Fetch Scottish Rock/Metal concerts from Ticketmaster Discovery API."""
        api_key = os.environ.get("TICKETMASTER_API_KEY")
        if not api_key:
            print("[FeedService] TICKETMASTER_API_KEY not set -- returning empty")
            return []

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    "https://app.ticketmaster.com/discovery/v2/events.json",
                    params={
                        "apikey": api_key,
                        "latlong": "55.8642,-4.2518",
                        "radius": "50",
                        "unit": "miles",
                        "classificationName": "rock,metal",
                        "size": 20,
                        "sort": "date,asc",
                    }
                )
                response.raise_for_status()
                data = response.json()

            events = data.get("_embedded", {}).get("events", [])
            concerts = []
            for event in events:
                venue_data = event.get("_embedded", {}).get("venues", [{}])[0]
                price_ranges = event.get("priceRanges", [{}])
                min_price = price_ranges[0].get("min") if price_ranges else None

                classifications = event.get("classifications", [{}])
                genre = classifications[0].get("genre", {}).get("name", "Rock") if classifications else "Rock"
                subgenre = classifications[0].get("subGenre", {}).get("name", "") if classifications else ""
                genre_display = f"{genre} / {subgenre}" if subgenre and subgenre != genre else genre

                concerts.append({
                    "artist": event.get("name", "Unknown"),
                    "venue": venue_data.get("name", "Unknown Venue"),
                    "city": venue_data.get("city", {}).get("name", "Unknown"),
                    "date": event.get("dates", {}).get("start", {}).get("localDate", ""),
                    "genre": genre_display,
                    "price": f"From \u00a3{min_price:.0f}" if min_price else "See listing",
                    "ticket_url": event.get("url", ""),
                })

            metal_keywords = ["metal", "rock", "heavy", "hardcore", "punk", "metalcore",
                              "doom", "thrash", "death", "black metal", "grunge", "stoner"]
            filtered = [c for c in concerts if any(k in c["genre"].lower() for k in metal_keywords)]

            # If strict filter removes everything, return all (Ticketmaster already filtered by classification)
            return filtered if filtered else concerts

        except Exception as e:
            print(f"[FeedService] Ticketmaster API error: {e}")
            return []
