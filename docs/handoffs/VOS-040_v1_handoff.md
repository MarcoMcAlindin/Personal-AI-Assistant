# HANDOFF: VOS-040 -- Fix Feeds Pipeline (RSS & Ticketmaster API)

## Header
- **Date:** 2026-03-16
- **From:** Mr. Green (Cloud Backend & API Engineer)
- **To:** Mr. Pink (Audit)
- **Task:** VOS-040 -- Fix Feeds Pipeline (RSS & Ticketmaster API)
- **Branch:** `feature/green/040-feeds-pipeline`
- **Commit:** `4da23e9`

---

## Summary of Changes

### Tech Feed Enhancement (feed_service.py)
- Added `description` field to RSS article output (truncated to 200 chars from `entry.summary`)
- All 5 fields now returned: `title`, `url`, `source`, `published_at`, `description`

### Ticketmaster API Integration (feed_service.py)
- Replaced entire mock `get_concerts()` method with real Ticketmaster Discovery API v2
- Query params: `countryCode=GB`, `stateCode=SCT`, `classificationName=rock,metal`, `size=20`, `sort=date,asc`
- Extracts: `artist`, `venue`, `city`, `date`, `genre` (with subgenre), `price`, `ticket_url`
- Secondary keyword filter for strict Metal/Rock compliance
- Falls back to full results if strict filter removes everything
- Returns `{"concerts": []}` gracefully when API key is missing or API errors

### Cleanup
- Removed unused `requests` import
- Removed unused `BeautifulSoup` import
- Removed mock concert data and venue URL list
- Using `httpx` (already in requirements.txt) for async HTTP

---

## Files Changed (1)

| File | Change |
|------|--------|
| `backend/app/services/feed_service.py` | Complete rewrite of concerts, description added to tech |

---

## Test Evidence

```
# Tech feed -- live RSS with description field
$ curl http://127.0.0.1:8000/api/v1/feeds/tech
Tech feed: 10 articles
  First: Railway secures $100 million to challenge AWS with AI-native...
  Has description: True

# Concerts -- graceful empty (no TICKETMASTER_API_KEY set)
$ curl http://127.0.0.1:8000/api/v1/feeds/concerts
{"concerts":[]}
# Server log: [FeedService] TICKETMASTER_API_KEY not set -- returning empty

# Both endpoints remain public (no auth required) -- confirmed
```

---

## Response Schema Contract

```json
{
  "articles": [
    {
      "title": "Railway secures $100 million...",
      "url": "https://...",
      "source": "VentureBeat",
      "published_at": "Sun, 16 Mar 2026 08:00:00 GMT",
      "description": "Railway secures $100 million to challenge AWS..."
    }
  ]
}
```

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

---

## Risk Notes
- Ticketmaster `stateCode=SCT` may not be recognized. Fallback options: `city=Glasgow` or `latlong=55.86,-4.25&radius=50`.
- API rate limit: 5 req/s. One call per user request is fine. Cache with 15-min TTL if needed later.
- Live concert test requires `TICKETMASTER_API_KEY` in `.env`. Graceful empty without it.

---

## Definition of Done Checklist
- [x] GET /api/v1/feeds/tech returns live RSS with title, url, source, published_at, description
- [x] GET /api/v1/feeds/concerts returns live Ticketmaster data (or empty without key)
- [x] Concerts filtered to Scotland + Rock/Metal genres
- [x] Returns {"concerts": []} (not error) when no events or missing key
- [x] No unused imports (requests, BeautifulSoup removed)
- [x] All changes committed to feature/green/040-feeds-pipeline
