---
name: job-campaign-orchestration
description: Guidelines for building the autonomous job scraping pipeline without Celery/Redis.
---
# Job Campaign Orchestration

Because we strictly prohibit Celery and Redis in the SuperCyan architecture, autonomous campaign orchestration must be handled via Cloud-native serverless patterns:

## Architecture
1. **Trigger:** Use Supabase `pg_cron` to schedule a periodic webhook every X hours, OR use Google Cloud Scheduler.
2. **Scraper Execution:** The trigger hits a dedicated `/api/v1/campaigns/run` FastAPI endpoint.
3. **Processing:** Since Cloud Run has Request Timeouts (up to 60 minutes), the FastAPI route can process scraping tasks synchronously or via standard `asyncio.gather` for multiple sources (Crustdata, Proxycurl).
4. **Data Storage:** Save the normalized jobs directly to the Supabase `inbox_items` table.

## Scraping APIs
Implement `crustdata.py` and `proxycurl.py` under `/backend/app/services/scrapers/`. Ensure strict error handling and rate-limit backoffs using standard `asyncio.sleep()`.

Avoid Playwright/Selenium unless absolutely necessary, as running headless browsers inside the FastAPI Cloud Run container significantly inflates the Docker image size and memory requirements. 
