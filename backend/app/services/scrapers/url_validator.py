"""
Job URL validator — three-layer filter applied before inserting scraped results.

Layer 1: Title heuristics — catches "19 jobs for X in Y" aggregation titles
Layer 2: URL structure — distinguishes individual posts from search result pages
Layer 3: HTTP HEAD check — drops dead links, 404s, and error pages

Used by Serper (Google Search) which returns organic results that occasionally
include job board search pages rather than individual job posts.
"""

import re
import asyncio
import logging
import httpx
from typing import Tuple

# ── Layer 1: Title patterns that indicate a search/listing page ──────────────
_SEARCH_TITLE_RE = re.compile(
    r"""
    ^\d+\s+jobs?\s+(for|in|at|near|found)              # "19 jobs for / in / at"
    | \d+\s+open\s+positions                            # "5 open positions"
    | (?:latest|new|current|top)\s+[\w\s]+\s+jobs?     # "latest python jobs"
    | [\w\s]+\s+job\s+(?:listings?|openings?|board|alerts?)  # "software job listings"
    | jobs?\s+near\s+you
    | job\s+search\s+(?:results?|page)
    | find\s+[\w\s]+\s+jobs?
    | [\w\s,-]+\s+jobs?\s+(?:in|near|at|across|for)\s+[\w\s,]+  # "Python jobs in Glasgow"
    | [\w\s,-]+\s+jobs?\s*\|\s*(?:linkedin|reed|indeed|glassdoor|totaljobs|monster|ziprecruiter|cwjobs|jobsite)  # "Python Jobs | Reed"
    | [\w\s,-]+\s+jobs?\s*[-–]\s*(?:apply|search|find|browse)   # "Python Jobs - Apply Now"
    """,
    re.IGNORECASE | re.VERBOSE,
)

# ── Layer 2: URL patterns ─────────────────────────────────────────────────────

# Strong positive signals — individual job posts on known ATS / job boards.
# If matched, skip all negative checks (avoids false-positives on valid posts).
_JOB_POST_URL_RE = re.compile(
    r"""
    /jobs/view/\d+                    # LinkedIn /jobs/view/12345
    | viewjob\?jk=                    # Indeed viewjob?jk=
    | /job-listing/                   # Glassdoor individual
    | /job/\d{4,}                     # generic /job/12345 (at least 4 digits)
    | /jobs/[a-z0-9_-]+-\d{5,}       # slug-ID (reed, totaljobs: /jobs/title-12345678)
    | [?&]job[-_]?id=\d+             # jobId= param
    | /vacancy/                       # vacancy URL
    | /posting/                       # posting URL
    | greenhouse\.io/jobs/[\w-]+      # Greenhouse ATS individual role
    | jobs\.lever\.co/[\w-]+/[0-9a-f-]{36}  # Lever ATS (UUID)
    | apply\.workable\.com/           # Workable ATS apply page
    | /jd/[a-z0-9]{6,}               # short job-detail IDs
    | /job-details/                   # common ATS pattern
    """,
    re.IGNORECASE | re.VERBOSE,
)

# URLs that are clearly search / listing pages (reject if no positive match above)
_SEARCH_URL_RE = re.compile(
    r"""
    /jobs/search[/?]                             # LinkedIn /jobs/search/
    | /jobs\?[^/]*(?:q|keywords|search)=        # query-string searches
    | [?&](?:q|query|search|keywords)=[^&]+     # generic search params
    | /search\?                                  # /search? page
    | /jobs/results                              # indeed results
    | /jobs/collections/                         # LinkedIn curated collections
    | /jobs/list                                 # generic listing path
    | [?&]sort=                                  # sort= param → listing page
    | /q-[\w%+-]+-l-[\w%+-]+-jobs(?:\.s?html?)? # Indeed path: /q-python-l-glasgow-jobs.html
    | EI_IE\d+                                   # Glassdoor company jobs hub: EI_IE12345
    | -jobs-in-|-jobs-near-|-jobs-at-            # reed/totaljobs: "python-jobs-in-glasgow"
    | /jobs/[a-z][a-z0-9-]+-jobs/?$             # reed: /jobs/python-developer-jobs/
    | /[a-z][a-z0-9-]+-jobs/?$                  # generic: /software-engineer-jobs/
    | \bjobs(?:/[a-z-]+)?/?$                     # URL ends with /jobs or /jobs/remote etc (no ID)
    """,
    re.IGNORECASE | re.VERBOSE,
)


def is_individual_job(title: str, url: str) -> Tuple[bool, str]:
    """
    Returns (is_valid, reason_if_rejected).
    True = looks like an individual job post.
    False = looks like a search/listing page, with a brief reason.

    Decision order:
      1. Strong positive URL signal (ATS path, /view/ID) → accept immediately.
      2. Title matches listing pattern → reject.
      3. URL matches listing pattern → reject.
      4. Default → accept.
    """
    # Layer 0: strong positive URL — bypass all negative checks
    if _JOB_POST_URL_RE.search(url or ""):
        return True, ""

    # Layer 1: title heuristics
    if _SEARCH_TITLE_RE.search(title or ""):
        return False, f"title looks like a search result: {title!r}"

    # Layer 2: URL structure
    if _SEARCH_URL_RE.search(url or ""):
        return False, f"URL matches search page pattern: {url!r}"

    return True, ""


async def url_is_reachable(url: str, timeout: float = 6.0) -> bool:
    """
    Async HEAD request to verify the URL returns a usable response (< 400).
    Falls back to GET if the server rejects HEAD.
    Returns True if reachable, False on error/timeout/4xx/5xx.
    """
    if not url or not url.startswith("http"):
        return False
    headers = {"User-Agent": "Mozilla/5.0 (compatible; SuperCyan-JobBot/1.0)"}
    try:
        async with httpx.AsyncClient(
            timeout=timeout,
            follow_redirects=True,
            headers=headers,
        ) as client:
            resp = await client.head(url)
            if resp.status_code == 405:
                # Server doesn't allow HEAD — try GET with a tiny range
                resp = await client.get(url, headers={**headers, "Range": "bytes=0-0"})
            return resp.status_code < 400
    except Exception as e:
        logging.debug(f"URL reachability check failed for {url}: {e}")
        return False


async def validate_jobs_batch(
    jobs: list[dict],
    check_reachability: bool = True,
    semaphore_limit: int = 8,
) -> list[dict]:
    """
    Filter a batch of raw job dicts (must have 'title' and 'url' keys).
    Applies all three layers; returns only valid individual job posts.

    check_reachability=True: runs HTTP HEAD checks (adds ~2–6s latency per batch
    but eliminates dead links). Set False for very large batches or dev mode.
    """
    # Layer 1 + 2 — synchronous, instant
    candidates = []
    for job in jobs:
        ok, reason = is_individual_job(job.get("title", ""), job.get("url", ""))
        if not ok:
            logging.debug(f"Job filtered (heuristic): {reason}")
        else:
            candidates.append(job)

    if not check_reachability or not candidates:
        return candidates

    # Layer 3 — async HEAD checks with a concurrency cap
    sem = asyncio.Semaphore(semaphore_limit)

    async def check(job: dict) -> dict | None:
        async with sem:
            ok = await url_is_reachable(job["url"])
            if not ok:
                logging.debug(f"Job filtered (unreachable): {job['url']!r}")
            return job if ok else None

    results = await asyncio.gather(*[check(j) for j in candidates])
    return [r for r in results if r is not None]
