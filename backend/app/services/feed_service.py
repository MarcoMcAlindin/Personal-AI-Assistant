import feedparser
import requests
from bs4 import BeautifulSoup
from typing import List, Dict
import os

class FeedService:
    def __init__(self):
        self.tech_feeds = [
            "https://venturebeat.com/category/ai/feed/",
            "https://techcrunch.com/category/artificial-intelligence/feed/"
        ]
        self.concert_venues = [
            {"name": "Barrowlands", "city": "Glasgow", "url": "https://glasgowbarrowland.com/events/"},
            {"name": "SWG3", "city": "Glasgow", "url": "https://swg3.tv/events"},
            {"name": "O2 Academy Glasgow", "city": "Glasgow", "url": "https://www.academymusicgroup.com/o2academyglasgow/events/all"}
        ]

    async def get_tech_news(self) -> List[Dict]:
        all_articles = []
        for url in self.tech_feeds:
            try:
                feed = feedparser.parse(url)
                for entry in feed.entries[:5]:
                    all_articles.append({
                        "title": entry.title,
                        "url": entry.link,
                        "source": feed.feed.title,
                        "published_at": entry.get('published', '')
                    })
            except Exception as e:
                print(f"Error parsing RSS {url}: {e}")
        return all_articles

    async def get_concerts(self) -> List[Dict]:
        mock_concerts = [
            {"artist": "Sleep Token", "venue": "O2 Academy", "city": "Glasgow", "date": "2026-05-15", "genre": "Alternative Metal", "ticket_url": "https://example.com/tickets/sleeptoken"},
            {"artist": "Architects", "venue": "Barrowlands", "city": "Glasgow", "date": "2026-06-02", "genre": "Metalcore", "ticket_url": "https://example.com/tickets/architects"}
        ]
        keywords = ["Metal", "Rock", "Heavy Metal", "Metalcore"]
        return [c for c in mock_concerts if any(k in c['genre'] for k in keywords)]
