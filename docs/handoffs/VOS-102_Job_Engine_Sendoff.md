# SENDOFF: VOS-102 — Job Engine Hardening & Scraper Validation
Created: 2026-03-22

## 1. Header Information
- **Date:** 2026-03-22
- **Recipient:** Execution Agent (Blue/Green)
- **Task ID:** VOS-102

## 2. Summary
The Job Engine is physically implemented (VOS-100) but currently lacks verified execution logs ("Ghost feature"). You must validate the end-to-end scraper pipeline, fix any connectivity issues with external APIs (Scrapfly, Crustdata), and ensure the AI matching logic produces non-null scores.

## 3. Files in Scope
- `backend/app/services/scrapers/multi_source_scraper.py` (Orchestration)
- `backend/app/services/scrapers/crustdata.py` (Potential fix needed)
- `backend/app/services/scrapers/proxycurl.py` (Potential fix needed)
- `backend/app/services/campaign_service.py` (Match logic)

## 4. Strict Testing Instructions
Execute the following to verify the pipeline:
1. **Scraper Test:**
   ```bash
   # Create a test campaign via API or DB
   # Run direct scraper test
   python -m backend.app.services.scrapers.multi_source_scraper
   ```
2. **Endpoint Test:**
   ```bash
   curl -X POST "http://localhost:8000/api/v1/scrapers/run/<CAMPAIGN_ID>" \
        -H "Authorization: Bearer <TOKEN>"
   ```
3. **Verification:** Check the `inbox_items` table in Supabase. `match_score` MUST NOT be NULL.

## 5. Notes for Next Agent
- **API Keys:** Ensure `CRUSTDATA_API_KEY` and `PROXYCURL_API_KEY` are configured in `.env`.
- **Latency:** The vLLM match logic can take 10s+ per job. Max results is set to 50; trim this to 5 for testing.
- **Rules:** Follow **Rule 32 (Versioning)**. Every modification you make to the scrapers MUST include a `Modified:` comment explaining what was fixed.

## 6. Evolution & Self-Healing
- Encountered "Ghost" status during Mr. Pink's audit (Rule 18/31).
- Updated `Jobs_feature_Architecture.md` to provide ground truth.
