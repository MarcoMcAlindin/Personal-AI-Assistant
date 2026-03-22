# HANDOFF: VOS-103 — Job Engine Feature Complete
**Date:** 2026-03-22
**Branch:** staging
**Status:** SHIPPED — all changes committed and pushed to staging

---

## 1. Summary

This session completed the Job Engine feature across backend and frontend. The engine went from a "Ghost feature" (VOS-102) with broken scrapers and a placeholder UI to a fully operational job search pipeline with a polished applications flow. The feature is production-ready pending API keys for Reed, CV-Library, and TotalJobs.

---

## 2. What Was Built

### 2.1 Apply Flow — Fire-and-Forget
**Problem:** Clicking Apply forced the user to wait for cover letter generation (30-60s warming + generation time) before the application was saved.

**Solution:**
- `POST /applications` now immediately creates the application with `cover_letter_text = ""` and returns 201
- Cover letter generation runs as a FastAPI `BackgroundTasks` task — no blocking
- Frontend `ApplyModal` simplified to three phases: CV relevance check → (CV mismatch warning if needed) → 1.5s success toast → auto-close
- Job post disappears from search results immediately on success
- Cover letter tab in `ApplicationDetailModal` detects the "still generating" state (`cover_letter_text === ""`) and shows "AI is thinking..." instead of a Generate button

### 2.2 Cover Letter — Manual Regeneration
- New `PATCH /applications/{id}/cover-letter` endpoint saves generated text back to the application
- New `regenerateCoverLetter()` in `campaignService.ts` — calls generate then save in sequence
- Cover letter tab shows a "Generate Cover Letter" button when `cover_letter_text` is null (never generated or background task failed)
- `isGeneratingCoverLetter` state prevents double-clicks

### 2.3 Delete Applications
- `DELETE /applications/{id}` backend endpoint
- `deleteApplication()` in `campaignService.ts`
- Trash icon on every application card — triggers `window.confirm()` with job title + company before deleting
- "Delete" button in `ApplicationDetailModal` status strip — two-step inline confirm ("Delete this application? / Yes delete / Cancel")

### 2.4 New Job Sources — 4 Scrapers Added
All scrapers follow the same pattern as Adzuna/Reed: normalize to `inbox_items` schema, score via `scoring.py`, skip gracefully if API key missing.

| Scraper | Source | Auth | Coverage |
|---------|--------|------|----------|
| `adzuna.py` | Adzuna | `ADZUNA_APP_ID` + `ADZUNA_APP_KEY` | UK/global aggregator, 250 req/day free |
| `reed.py` | Reed.co.uk | `REED_API_KEY` (HTTP Basic) | UK jobs, strong for contracts |
| `cvlibrary.py` | CV-Library | `CVLIBRARY_API_KEY` | UK agencies, free at api.cv-library.co.uk |
| `totaljobs.py` | TotalJobs | `TOTALJOBS_API_KEY` (Bearer) | UK agencies, Stepstone Group |
| `jobicy.py` | Jobicy | None (free) | Remote tech/AI |
| `himalayas.py` | Himalayas | None (free) | Remote AI/ML/engineering |

**Note on Indeed:** Indeed killed their public search API in 2021. Coverage comes indirectly via Serper's Google Jobs `/jobs` endpoint which aggregates Indeed postings.

### 2.5 Serper Scraper Rewrite
- Three parallel requests: broad organic, targeted `site:linkedin.com/jobs/view/` + ATS sites, Google Jobs structured panel
- Non-job domain blocklist replaces the too-restrictive allowlist
- URL deduplication across all three result sets

### 2.6 URL Validator Hardening
Three-layer filter:
1. **Positive bypass** — ATS URLs (greenhouse.io, lever.co, workable.com, etc.) skip all negative checks
2. **Title heuristics** — catches "Python Jobs in Glasgow | Reed", "19 Python jobs - Apply Now"
3. **Negative URL patterns** — catches `/q-python-l-glasgow-jobs.html`, `EI_IE\d+` (Glassdoor), `-jobs-in-`, `/[a-z]-jobs/`

### 2.7 Em-Dash Ban — Full Stack
**Instruction layer:** Added "Never use em dashes (—); use a plain hyphen (-) instead" to every Qwen system prompt (chat, cover letter, interview questions, campaign analysis, email rewrite).

**Sanitizer layer:** `_sanitize_output(text)` in `ai_service.py` replaces U+2014 and U+2013 on every AI response before it leaves the backend, regardless of model behaviour.

**Frontend:** All hardcoded em dashes removed from JSX strings, labels, and salary range formatters across all scrapers.

### 2.8 Interview Questions — 7 Questions with CV Grounding
- Count increased from 5 to 7
- Q1-4: role-specific technical/situational questions based on job description
- Q5-7: personal achievement and career goal questions grounded in the candidate's CV text
- `generate_interview_questions_ai()` accepts `cv_text` parameter; interview endpoint fetches primary CV and passes it

### 2.9 WeworkRemotely — Dynamic Category Routing
Was hardcoded to the programming RSS feed only. Now has `_FEEDS` dict (12 categories) and `_KEYWORD_MAP` (30+ keyword-to-category mappings) so the correct category feed is selected per campaign.

### 2.10 Scrape Logs + Campaign Totals
- `_write_scrape_log()` in `MultiSourceScraper` writes execution evidence to `scrape_logs` table after every scraper run
- `_update_campaign_total()` increments `total_jobs_found` on the campaigns row after each run so the UI shows real counts

---

## 3. API Keys Needed

| Key | Where to Register | Status |
|-----|-------------------|--------|
| `ADZUNA_APP_ID` + `ADZUNA_APP_KEY` | developer.adzuna.com | Configured in .env |
| `REED_API_KEY` | reed.co.uk/developers/jobseeker | Pending |
| `CVLIBRARY_API_KEY` | api.cv-library.co.uk | Pending |
| `TOTALJOBS_API_KEY` | totaljobs.com/recruiting/advertise/jobs-api | Pending |
| `SERPER_API_KEY` | serper.dev | Configured |

---

## 4. Files Changed

### Backend
- `backend/app/api/v1/endpoints.py` — BackgroundTasks apply flow, DELETE /applications, PATCH /applications/{id}/cover-letter, save endpoint
- `backend/app/services/ai_service.py` — em-dash ban in all prompts + `_sanitize_output()` helper
- `backend/app/services/scrapers/multi_source_scraper.py` — added 6 scrapers, scrape_logs, campaign total update
- `backend/app/services/scrapers/serper.py` — full rewrite (3 parallel queries, Google Jobs panel)
- `backend/app/services/scrapers/weworkremotely.py` — dynamic category routing
- `backend/app/services/scrapers/crustdata.py` — fixed keyword/location field names
- `backend/app/services/scrapers/adzuna.py` — new
- `backend/app/services/scrapers/reed.py` — new
- `backend/app/services/scrapers/cvlibrary.py` — new
- `backend/app/services/scrapers/totaljobs.py` — new
- `backend/app/services/scrapers/jobicy.py` — new
- `backend/app/services/scrapers/himalayas.py` — new
- `backend/app/services/scrapers/url_validator.py` — new
- `backend/app/services/cv_service.py` — new
- `backend/.env.example` — added all new key entries

### Frontend
- `web/src/components/cyan/JobsView.tsx` — full apply flow rewrite, delete, cover letter regeneration, em-dash cleanup, new source badges
- `web/src/services/campaignService.ts` — deleteApplication, regenerateCoverLetter, updated createApplication

---

## 5. Known Limitations

- **LinkedIn direct results:** LinkedIn blocks Google indexing of individual job posts. Coverage comes via Google Jobs aggregation (Serper `/jobs` endpoint). There is no LinkedIn Jobs API available publicly.
- **Reed/CV-Library/TotalJobs:** Scrapers are implemented but will return `skipped` until API keys are added to `.env`.
- **Cover letter "still generating":** Detected by `cover_letter_text === ""`. If the background task fails silently (e.g. vLLM cold start), the user sees "AI is thinking..." indefinitely. They can refresh and use the manual Generate button if the empty string persists.

---

## 6. Next Priority Areas

Based on conversation, the following features are candidates for the next session:
- Other parts of the app (non-jobs) — user indicated readiness to move on
- Reed/CV-Library/TotalJobs key registration and testing once keys arrive
