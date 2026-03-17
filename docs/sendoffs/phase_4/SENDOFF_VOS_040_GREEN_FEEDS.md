# SENDOFF: VOS-040 — Fix Feeds Pipeline (RSS & Ticketmaster API)

## Header
- **Date:** 2026-03-16
- **From:** Mr. Pink (Scout & Auditor)
- **To:** Mr. Green (Cloud Backend & API Engineer)
- **Task:** VOS-040 — Fix Feeds Pipeline (RSS & Ticketmaster API)
- **Branch:** `feature/green/040-feeds-pipeline`
- **Priority:** HIGH
- **Depends on:** VOS-039 (CORS/auth must be merged first)

---

## Context

The tech feed endpoint works (live RSS parsing from VentureBeat + TechCrunch), but the concerts endpoint is **entirely mocked** — it returns 2 hardcoded events and has zero Ticketmaster integration. The PRD requires live concert data from the Ticketmaster API, filtered to Metal/Rock genres in Scotland. The `glasgow-concert-parser` skill and `config.py` both reference a `TICKETMASTER_API_KEY` that is defined but never used.

Both frontends are already wired to consume these endpoints:
- **Web:** `web/src/services/feedService.ts` calls `GET /api/v1/feeds/tech` and `GET /api/v1/feeds/concerts`
- **Mobile:** `mobile/src/services/api.js` calls the same endpoints (lines 20-29)

The web UI expects concerts to have: `artist`, `venue`, `city`, `date`, `genre`, `ticket_url`, and `price`. The mobile UI expects the same fields.

---

## Mission

### Step 1: Verify Tech Feed Is Stable

**File:** `backend/app/services/feed_service.py` (lines 24-40)

The tech feed RSS parser already works. Verify it handles edge cases:

```bash
curl http://localhost:8000/api/v1/feeds/tech | python3 -m json.tool
```

**Expected:** JSON with `articles` array, each having `title`, `url`, `source`, `published_at`.

**Potential issue:** If VentureBeat or TechCrunch change their RSS structure, `feedparser` may return empty entries. Add a `description` field from `entry.get('summary', '')` to match what the frontends may want to display:

```python
all_articles.append({
    "title": entry.title,
    "url": entry.link,
    "source": feed.feed.title,
    "published_at": entry.get('published', ''),
    "description": entry.get('summary', '')[:200]  # Truncate for preview
})
```

### Step 2: Implement Real Ticketmaster API Integration

**File:** `backend/app/services/feed_service.py` — Replace the `get_concerts()` method (lines 42-73)

**Ticketmaster Discovery API v2:**
- Base URL: `https://app.ticketmaster.com/discovery/v2/events.json`
- Auth: API key as query parameter `apikey=<key>`
- Docs: `https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/`

**Required query parameters for Scottish Metal/Rock concerts:**

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `apikey` | `settings.ticketmaster_api_key` | Authentication |
| `countryCode` | `GB` | United Kingdom |
| `stateCode` | `SCT` | Scotland (Ticketmaster uses ISO 3166-2 subdivision) |
| `classificationName` | `rock,metal` | Genre filter |
| `size` | `20` | Results per page |
| `sort` | `date,asc` | Upcoming first |

**Full implementation:**

```python
async def get_concerts(self) -> List[Dict]:
    """Fetch Scottish Rock/Metal concerts from Ticketmaster Discovery API."""
    api_key = os.environ.get("TICKETMASTER_API_KEY")
    if not api_key:
        print("[FeedService] TICKETMASTER_API_KEY not set — returning empty")
        return []

    try:
        import httpx
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                "https://app.ticketmaster.com/discovery/v2/events.json",
                params={
                    "apikey": api_key,
                    "countryCode": "GB",
                    "stateCode": "SCT",
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

            # Extract genre/subgenre
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
                "price": f"From £{min_price:.0f}" if min_price else "See listing",
                "ticket_url": event.get("url", ""),
            })

        # Secondary keyword filter for strict Metal/Rock compliance
        metal_keywords = ["Metal", "Rock", "Heavy", "Hardcore", "Punk", "Metalcore", "Doom", "Thrash", "Death", "Black Metal", "Grunge", "Stoner"]
        filtered = [c for c in concerts if any(k.lower() in c["genre"].lower() for k in metal_keywords)]

        # If strict filter removes everything, return all results (Ticketmaster already filtered by classification)
        return filtered if filtered else concerts

    except Exception as e:
        print(f"[FeedService] Ticketmaster API error: {e}")
        return []
```

### Step 3: Use `settings` Instead of `os.environ`

**Consistency fix:** Import the Pydantic `settings` object instead of using `os.environ.get()` directly, to match the pattern established in `config.py`:

```python
# At the top of feed_service.py, add:
from app.utils.config import settings

# Then in get_concerts():
api_key = settings.ticketmaster_api_key
```

### Step 4: Clean Up Unused Imports

**File:** `backend/app/services/feed_service.py`

Remove unused imports that were from the mock implementation:
- `requests` (line 2) — not used, and not in `requirements.txt`
- `BeautifulSoup` from `bs4` (line 3) — was for scraping, not needed with Ticketmaster API

Keep `feedparser` (used by `get_tech_news()`).

Add `httpx` import at the top (used by the new Ticketmaster code):
```python
import httpx
```

### Step 5: Add `requests` or Remove It

`requests` is imported on line 2 but never used and is not in `requirements.txt`. Since we're using `httpx` (which IS in requirements.txt) for the Ticketmaster call, remove the `requests` import entirely.

---

## Response Schema Contract

Both frontends expect these fields. The Ticketmaster implementation above produces all of them:

```json
{
  "concerts": [
    {
      "artist": "Sleep Token",
      "venue": "O2 Academy Glasgow",
      "city": "Glasgow",
      "date": "2026-05-15",
      "genre": "Alternative Metal / Progressive",
      "price": "From £45",
      "ticket_url": "https://www.ticketmaster.co.uk/event/..."
    }
  ]
}
```

```json
{
  "articles": [
    {
      "title": "OpenAI releases GPT-5",
      "url": "https://...",
      "source": "VentureBeat",
      "published_at": "Sun, 16 Mar 2026 08:00:00 GMT",
      "description": "OpenAI has announced..."
    }
  ]
}
```

---

## Key Files

| File | What to Do |
|------|-----------|
| `backend/app/services/feed_service.py` | Replace mock concerts with Ticketmaster API, add `description` to tech feed |
| `backend/app/utils/config.py` | Already has `ticketmaster_api_key` — no change needed |
| `backend/.env` | Ensure `TICKETMASTER_API_KEY` is set with a valid key |

---

## Definition of Done

- [ ] `GET /api/v1/feeds/tech` returns live RSS articles with `title`, `url`, `source`, `published_at`, `description`
- [ ] `GET /api/v1/feeds/concerts` returns live Ticketmaster data with `artist`, `venue`, `city`, `date`, `genre`, `price`, `ticket_url`
- [ ] Concerts are filtered to Scotland + Rock/Metal genres
- [ ] Returns `{"concerts": []}` (not error) when no events found or API key is missing
- [ ] No unused imports (`requests`, `BeautifulSoup`)
- [ ] Works from web app (after VOS-039 CORS fix) and mobile app
- [ ] All changes committed and pushed to `feature/green/040-feeds-pipeline`
- [ ] Handoff Letter submitted with curl output evidence

---

## Verification

```bash
# Test tech feed
curl http://localhost:8000/api/v1/feeds/tech | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{len(d[\"articles\"])} articles'); print(d['articles'][0])"

# Test concerts
curl http://localhost:8000/api/v1/feeds/concerts | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{len(d[\"concerts\"])} concerts'); [print(f'{c[\"artist\"]} @ {c[\"venue\"]} - {c[\"date\"]}') for c in d['concerts'][:5]]"

# Test empty state (with invalid API key)
TICKETMASTER_API_KEY="" curl http://localhost:8000/api/v1/feeds/concerts
# Expected: {"concerts": []}
```

---

## Worktree Setup

```bash
cd /home/marco/vibeos-worktrees/green
git fetch origin staging
git rebase origin/staging  # Ensure VOS-039 changes are included
git checkout -b feature/green/040-feeds-pipeline
```

---

## Risk Notes

- Ticketmaster API has rate limits (5 requests/second for Discovery API). The backend makes one call per user request, which is fine for now. If scaling is needed later, add a cache with a 15-minute TTL.
- The `stateCode=SCT` parameter may not be recognized by Ticketmaster — test it. If it doesn't work, fall back to `city=Glasgow` or `latlong=55.86,-4.25&radius=50` (Glasgow coordinates, 50-mile radius).
- If there are genuinely no upcoming Metal/Rock events in Scotland at the time of testing, the endpoint will correctly return an empty array. Seed with broader parameters temporarily if needed for demo purposes.

---

*Mr. Pink — Scout & Auditor*
*"Kill the mock data. Real concerts from real APIs."*
