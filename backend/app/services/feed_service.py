import feedparser
import httpx
from typing import List, Dict, Optional
import os

# Static whitelist of well-known metal/rock artists used when Spotify is not
# connected or the caller does not pass my_artists=True.  Matching is
# case-insensitive substring against the event name returned by Ticketmaster.
STATIC_METAL_ARTISTS = [
    "metallica", "slipknot", "tool", "system of a down", "pantera",
    "iron maiden", "judas priest", "black sabbath", "ozzy", "megadeth",
    "anthrax", "testament", "exodus", "slayer", "sepultura",
    "lamb of god", "mastodon", "gojira", "opeth", "neurosis",
    "converge", "deftones", "korn", "disturbed", "five finger death punch",
    "avenged sevenfold", "bring me the horizon", "parkway drive",
    "trivium", "bullet for my valentine", "killswitch engage",
    "architects", "while she sleeps", "spiritbox", "babymetal",
    "nightwish", "within temptation", "epica", "lacuna coil",
    "dimmu borgir", "cradle of filth", "behemoth", "cannibal corpse",
    "death", "morbid angel", "deicide", "obituary", "napalm death",
    "carcass", "arch enemy", "children of bodom", "amon amarth",
    "in flames", "dark tranquillity", "soilwork", "hatebreed",
    "thy art is murder", "whitechapel", "suicide silence",
    "devildriver", "machine head", "biohazard", "prong",
    "alice in chains", "soundgarden", "pearl jam", "nirvana",
    "foo fighters", "queens of the stone age", "rage against the machine",
    "audioslave", "stone sour", "volbeat", "ghost", "royal blood",
    "rival sons", "black stone cherry", "alter bridge", "shinedown",
    "breaking benjamin", "halestorm", "evanescence", "within temptation",
]


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

    async def get_concerts(
        self,
        artist_names: Optional[List[str]] = None,
    ) -> List[Dict]:
        """Fetch Scottish Rock/Metal concerts from Ticketmaster Discovery API.

        Args:
            artist_names: Optional list of artist names to filter by (e.g. from
                Spotify top artists).  When provided the results are narrowed to
                events whose name contains at least one of these artists.  When
                None or empty the static STATIC_METAL_ARTISTS whitelist is used
                as the fallback filter so the caller always gets relevant results
                rather than raw unfiltered Ticketmaster output.
        """
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

            # Genre keyword filter — always applied as primary pass
            metal_keywords = ["metal", "rock", "heavy", "hardcore", "punk", "metalcore",
                              "doom", "thrash", "death", "black metal", "grunge", "stoner"]
            by_genre = [c for c in concerts if any(k in c["genre"].lower() for k in metal_keywords)]
            # Fall back to all Ticketmaster results if genre filter is too aggressive
            candidates = by_genre if by_genre else concerts

            # Artist name filter — Spotify list takes priority, then static whitelist
            filter_list = [a.lower() for a in artist_names] if artist_names else STATIC_METAL_ARTISTS
            by_artist = [
                c for c in candidates
                if any(a in c["artist"].lower() for a in filter_list)
            ]
            # Only apply artist filter if it yields results; otherwise return genre-filtered list
            return by_artist if by_artist else candidates

        except Exception as e:
            print(f"[FeedService] Ticketmaster API error: {e}")
            return []
