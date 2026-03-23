# Job Engine Architecture (SuperCyan)
Created: 2026-03-22
<!-- 
Modified: 2026-03-22
What: Initial detailed architecture sync from code reality.
Why: Documenting the "Ghost" implementation for the next agent.
-->

## 1. Overview
The Job Engine is a high-performance, autonomous pipeline for job searching, matching, and application. It is built to run 24/7 on Google Cloud Run.

## 2. Component Breakdown

### 2.1. Backend Services (`/backend/app/services/`)
- **`campaign_service.py`**: Orchestrates campaign lifecycle.
  - `create_campaign`: Triggers a "cold-start" AI analysis in the background (`_run_initial_analysis`).
  - `get_inbox`: Retrieves matched jobs (Human-In-The-Loop).
  - `create_application`: Prepares a cover letter and stages the app for submission.
- **`scrapers/`**: Parallel execution layer.
  - `multi_source_scraper.py`: Uses `asyncio.gather` to run all scrapers simultaneously.
  - Supported: `WeWorkRemotely`, `Serper`, `Crustdata`, `Proxycurl`.

### 2.2. Frontend (Cyan UI)
- **`web/src/components/cyan/JobsView.tsx`**:
  - Multi-tab view: Dashboard, Active Campaigns, and HITL Inbox.
  - Real-time updates via Supabase PostgreSQL channels.
  - CV upload & storage (PDF/DOCX).

### 2.3. AI Intelligence (`ai_service.py`)
- **`generate_campaign_analysis`**: Uses Qwen3-Coder (cloud) to provide strategic advice on campaign match potential.
- **Semantic Matching**: Leverages `pgvector` for similarity scoring between job descriptions and user CVs.

## 3. Data Flow
1. **User** creates Campaign via `JobsView.tsx`.
2. **Backend** inserts to Supabase → triggers `RUNNING` status.
3. **MultiSourceScraper** fetches jobs → AI scores them → results appear in **Inbox**.
4. **User** reviews (Approve/Reject) → **Approved** items move to **Applications**.

---

## 4. UI Fixes & Improvements

### 4.1. Application Delete Confirmation Modal (2026-03-23)
**Problem:** The trash icon on application cards used `window.confirm()` — a native browser dialog that doesn't match the app's design system.

**Fix:** Replaced with the same full-screen modal pattern used by campaign delete:
- State: `deletingApplicationId: string | null` (mirrors `deletingCampaignId`)
- Trigger: trash icon sets `deletingApplicationId(app.id)` instead of calling `window.confirm()`
- Modal: red `XCircle` header, info box with job title + company (resolved from `cover_letter_metadata.job_snapshot` with `inbox_items` fallback), Cancel / Delete Application buttons
- Commit: `bb94b81` on `staging`

**File changed:** `web/src/components/cyan/JobsView.tsx`
