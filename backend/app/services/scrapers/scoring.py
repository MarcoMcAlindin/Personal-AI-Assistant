"""
Lightweight keyword-overlap match scoring used by all scrapers.

Computes a real match_score (0.0–1.0) and a human-readable match_reasoning
string by comparing campaign job_preferences against scraped job fields.
No ML required — pure string matching against keywords, job type, and location.
"""
import re
from typing import Tuple


def score_job(job_title: str, job_description: str, campaign: dict) -> Tuple[float, str]:
    """
    Returns (match_score, match_reasoning) for a scraped job against campaign prefs.

    Scoring breakdown (weights sum to 1.0):
      - Keyword matches in title:       0.40
      - Keyword matches in description: 0.30
      - Job type match (full/part):     0.15
      - Work arrangement match:         0.15

    Score is clamped to [0.30, 1.0] — 0.30 is the floor for any job that
    passed the scraper query, 1.0 is a perfect match.
    """
    prefs = campaign.get("job_preferences", {}) or {}
    raw_keywords = prefs.get("keywords", "") or ""
    job_type_pref = (prefs.get("job_type") or "").lower()        # "full-time" | "part-time" | ""
    arrangement_pref = (prefs.get("work_arrangement") or "").lower()  # "remote" | "hybrid" | "onsite" | ""

    # Tokenise keywords into individual terms
    keywords = [k.strip().lower() for k in re.split(r"[,\s]+", raw_keywords) if k.strip()]
    if not keywords:
        # No keywords configured — base score for any match
        return 0.65, "Matches campaign search query."

    title_lower = (job_title or "").lower()
    desc_lower = (job_description or "").lower()

    # Count keyword hits
    title_hits = [kw for kw in keywords if kw in title_lower]
    desc_hits   = [kw for kw in keywords if kw in desc_lower and kw not in title_hits]
    all_hits    = title_hits + desc_hits
    total_kw    = len(keywords)

    title_score = (len(title_hits) / total_kw) * 0.40
    desc_score  = (len(desc_hits)  / total_kw) * 0.30

    # Job type bonus
    job_type_score = 0.0
    job_type_match = ""
    if job_type_pref:
        combined = f"{title_lower} {desc_lower}"
        if job_type_pref in combined or (job_type_pref == "full-time" and "full time" in combined):
            job_type_score = 0.15
            job_type_match = f"{job_type_pref} role confirmed"
        else:
            job_type_score = 0.05  # partial — we don't know, give benefit of doubt

    # Work arrangement bonus
    arrangement_score = 0.0
    arrangement_match = ""
    if arrangement_pref:
        combined = f"{title_lower} {desc_lower}"
        if arrangement_pref in combined or (arrangement_pref == "onsite" and "on-site" in combined):
            arrangement_score = 0.15
            arrangement_match = f"{arrangement_pref} position confirmed"
        else:
            arrangement_score = 0.05

    raw_score = 0.30 + title_score + desc_score + job_type_score + arrangement_score
    score = min(round(raw_score, 2), 1.0)

    # Build reasoning string
    parts = []
    if title_hits:
        parts.append(f"Title matches: {', '.join(title_hits)}")
    if desc_hits:
        parts.append(f"Description matches: {', '.join(desc_hits[:5])}")
    if all_hits:
        parts.append(f"{len(all_hits)}/{total_kw} keywords found")
    if job_type_match:
        parts.append(job_type_match)
    if arrangement_match:
        parts.append(arrangement_match)
    if not parts:
        parts.append(f"Matched search query for '{raw_keywords}'")

    return score, ". ".join(parts) + "."
