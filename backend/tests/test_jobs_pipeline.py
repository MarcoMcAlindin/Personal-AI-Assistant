"""
VOS-102 — Job Engine Pipeline Tests
Mr. Green | Backend Domain
Tests for all four scrapers and MultiSourceScraper orchestrator.
Supabase and HTTP clients are mocked; no live network calls required.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

CAMPAIGN = {
    "id": "test-campaign-uuid",
    "user_id": "test-user-uuid",
    "name": "Senior Python Engineer",
    "job_preferences": {
        "keywords": "Python Engineer",
        "location": "Remote",
        "role_titles": ["Senior Python Engineer", "Staff Engineer"],
    },
    "max_results_per_run": 5,
}


def _mock_supabase():
    """Returns a Supabase client mock that accepts any table().insert().execute() call."""
    mock = MagicMock()
    mock.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[{"id": "row-1"}])
    return mock


# ---------------------------------------------------------------------------
# WeWorkRemotelyScraper
# ---------------------------------------------------------------------------

class TestWeWorkRemotelyScraper:
    @pytest.mark.asyncio
    async def test_scrapes_and_inserts(self):
        from app.services.scrapers.weworkremotely import WeWorkRemotelyScraper

        mock_feed = MagicMock()
        mock_feed.entries = [
            MagicMock(
                title="Acme Corp: Senior Python Engineer",
                link="https://weworkremotely.com/job/1",
                id="wwr-1",
                description="Build backend services.",
            )
        ]

        supabase = _mock_supabase()
        scraper = WeWorkRemotelyScraper(supabase)

        with patch("asyncio.get_event_loop") as mock_loop:
            future = MagicMock()
            future.__await__ = lambda self: iter([mock_feed])
            mock_loop.return_value.run_in_executor = AsyncMock(return_value=mock_feed)

            result = await scraper.scrape_jobs_for_campaign(CAMPAIGN)

        assert result["status"] == "success"
        assert result["scraped_count"] == 1
        supabase.table.assert_called_with("inbox_items")

    @pytest.mark.asyncio
    async def test_duplicate_insert_skipped(self):
        """A duplicate external_job_id should not abort the loop."""
        from app.services.scrapers.weworkremotely import WeWorkRemotelyScraper

        mock_feed = MagicMock()
        mock_feed.entries = [
            MagicMock(title="Co: Job A", link="https://wwr.com/1", id="wwr-1", description="desc"),
            MagicMock(title="Co: Job B", link="https://wwr.com/2", id="wwr-2", description="desc"),
        ]

        supabase = _mock_supabase()
        # First insert succeeds, second raises duplicate error
        supabase.table.return_value.insert.return_value.execute.side_effect = [
            MagicMock(data=[{"id": "row-1"}]),
            Exception("duplicate key value violates unique constraint"),
        ]
        scraper = WeWorkRemotelyScraper(supabase)

        with patch("asyncio.get_event_loop") as mock_loop:
            mock_loop.return_value.run_in_executor = AsyncMock(return_value=mock_feed)
            result = await scraper.scrape_jobs_for_campaign(CAMPAIGN)

        # First entry counted; second skipped — should not crash
        assert result["status"] == "success"
        assert result["scraped_count"] == 1

    @pytest.mark.asyncio
    async def test_feed_fetch_failure_returns_failed(self):
        from app.services.scrapers.weworkremotely import WeWorkRemotelyScraper

        supabase = _mock_supabase()
        scraper = WeWorkRemotelyScraper(supabase)

        with patch("asyncio.get_event_loop") as mock_loop:
            mock_loop.return_value.run_in_executor = AsyncMock(side_effect=Exception("network error"))
            result = await scraper.scrape_jobs_for_campaign(CAMPAIGN)

        assert result["status"] == "failed"
        assert result["scraped_count"] == 0


# ---------------------------------------------------------------------------
# SerperScraper
# ---------------------------------------------------------------------------

class TestSerperScraper:
    @pytest.mark.asyncio
    async def test_skips_when_no_api_key(self):
        from app.services.scrapers.serper import SerperScraper

        supabase = _mock_supabase()
        with patch.dict("os.environ", {}, clear=True):
            scraper = SerperScraper(supabase)
            scraper.api_key = None
            result = await scraper.scrape_jobs_for_campaign(CAMPAIGN)

        assert result["status"] == "failed"
        assert result["scraped_count"] == 0

    @pytest.mark.asyncio
    async def test_scrapes_and_inserts(self):
        from app.services.scrapers.serper import SerperScraper

        api_response = {
            "jobs": [
                {
                    "title": "Senior Python Engineer",
                    "company": "Acme",
                    "location": "Remote",
                    "link": "https://linkedin.com/job/1",
                    "job_id": "li-1",
                    "description": "Python, FastAPI, PostgreSQL.",
                }
            ]
        }

        supabase = _mock_supabase()
        scraper = SerperScraper(supabase)
        scraper.api_key = "test-key"

        mock_resp = MagicMock()
        mock_resp.json.return_value = api_response
        mock_resp.raise_for_status = MagicMock()

        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_resp)
            mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

            result = await scraper.scrape_jobs_for_campaign(CAMPAIGN)

        assert result["status"] == "success"
        assert result["scraped_count"] == 1


# ---------------------------------------------------------------------------
# CrustdataScraper
# ---------------------------------------------------------------------------

class TestCrustdataScraper:
    @pytest.mark.asyncio
    async def test_simulates_when_no_api_key(self):
        from app.services.scrapers.crustdata import CrustdataScraper

        supabase = _mock_supabase()
        scraper = CrustdataScraper(supabase)
        scraper.api_key = ""
        result = await scraper.scrape_jobs_for_campaign(CAMPAIGN)

        assert result["status"] == "simulated_success"

    @pytest.mark.asyncio
    async def test_scrapes_and_inserts(self):
        from app.services.scrapers.crustdata import CrustdataScraper

        api_response = {
            "jobs": [
                {
                    "id": "cd-1",
                    "title": "Senior Python Engineer",
                    "company": {"name": "Acme", "logo_url": None},
                    "location": "Remote",
                    "apply_url": "https://acme.com/apply",
                    "description": "Build APIs.",
                    "remote": True,
                }
            ]
        }

        supabase = _mock_supabase()
        scraper = CrustdataScraper(supabase)
        scraper.api_key = "test-key"

        mock_resp = MagicMock()
        mock_resp.json.return_value = api_response
        mock_resp.raise_for_status = MagicMock()

        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_resp)
            mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

            result = await scraper.scrape_jobs_for_campaign(CAMPAIGN)

        assert result["status"] == "success"
        assert result["scraped_count"] == 1

    @pytest.mark.asyncio
    async def test_duplicate_insert_skipped(self):
        from app.services.scrapers.crustdata import CrustdataScraper

        api_response = {
            "jobs": [
                {"id": "cd-1", "title": "Job A", "company": {"name": "Co"}, "location": "Remote",
                 "apply_url": "https://co.com/1", "description": "desc"},
                {"id": "cd-2", "title": "Job B", "company": {"name": "Co"}, "location": "Remote",
                 "apply_url": "https://co.com/2", "description": "desc"},
            ]
        }

        supabase = _mock_supabase()
        supabase.table.return_value.insert.return_value.execute.side_effect = [
            MagicMock(data=[{"id": "row-1"}]),
            Exception("duplicate key value violates unique constraint"),
        ]
        scraper = CrustdataScraper(supabase)
        scraper.api_key = "test-key"

        mock_resp = MagicMock()
        mock_resp.json.return_value = api_response
        mock_resp.raise_for_status = MagicMock()

        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_resp)
            mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)
            result = await scraper.scrape_jobs_for_campaign(CAMPAIGN)

        assert result["status"] == "success"
        assert result["scraped_count"] == 1


# ---------------------------------------------------------------------------
# ProxycurlScraper
# ---------------------------------------------------------------------------

class TestProxycurlScraper:
    @pytest.mark.asyncio
    async def test_simulates_when_no_api_key(self):
        from app.services.scrapers.proxycurl import ProxycurlScraper

        supabase = _mock_supabase()
        scraper = ProxycurlScraper(supabase)
        scraper.api_key = ""
        result = await scraper.scrape_jobs_for_campaign(CAMPAIGN)

        assert result["status"] == "simulated_success"

    @pytest.mark.asyncio
    async def test_handles_rate_limit(self):
        from app.services.scrapers.proxycurl import ProxycurlScraper

        supabase = _mock_supabase()
        scraper = ProxycurlScraper(supabase)
        scraper.api_key = "test-key"

        mock_resp = MagicMock()
        mock_resp.status_code = 429

        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_resp)
            mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

            with patch("asyncio.sleep", new_callable=AsyncMock):
                result = await scraper.scrape_jobs_for_campaign(CAMPAIGN)

        assert result["status"] == "rate_limited"


# ---------------------------------------------------------------------------
# MultiSourceScraper
# ---------------------------------------------------------------------------

class TestMultiSourceScraper:
    @pytest.mark.asyncio
    async def test_aggregates_all_scraper_results(self):
        from app.services.scrapers.multi_source_scraper import MultiSourceScraper

        supabase = _mock_supabase()
        scraper = MultiSourceScraper(supabase)

        # Patch all child scrapers to return controlled results
        for child in scraper.scrapers:
            child.scrape_jobs_for_campaign = AsyncMock(
                return_value={"scraped_count": 3, "status": "success", "job_ids": []}
            )

        result = await scraper.scrape_jobs_for_campaign(CAMPAIGN)

        assert result["status"] == "success"
        assert result["scraped_count"] == 36  # 12 scrapers × 3 each
        assert result["errors"] is None

    @pytest.mark.asyncio
    async def test_partial_success_on_scraper_failure(self):
        from app.services.scrapers.multi_source_scraper import MultiSourceScraper

        supabase = _mock_supabase()
        scraper = MultiSourceScraper(supabase)

        results = [
            {"scraped_count": 5, "status": "success"},
            {"scraped_count": 0, "status": "failed", "error": "API key missing"},
            {"scraped_count": 3, "status": "success"},
            {"scraped_count": 0, "status": "simulated_success"},
        ]
        for child, res in zip(scraper.scrapers, results):
            child.scrape_jobs_for_campaign = AsyncMock(return_value=res)

        result = await scraper.scrape_jobs_for_campaign(CAMPAIGN)

        assert result["status"] == "partial_success"
        assert result["scraped_count"] == 8
        assert len(result["errors"]) == 1

    @pytest.mark.asyncio
    async def test_writes_scrape_logs(self):
        """Each scraper run must produce a row in scrape_logs."""
        from app.services.scrapers.multi_source_scraper import MultiSourceScraper

        supabase = _mock_supabase()
        scraper = MultiSourceScraper(supabase)

        for child in scraper.scrapers:
            child.scrape_jobs_for_campaign = AsyncMock(
                return_value={"scraped_count": 2, "status": "success", "job_ids": []}
            )

        await scraper.scrape_jobs_for_campaign(CAMPAIGN)

        scrape_log_calls = [
            call for call in supabase.table.call_args_list
            if call.args[0] == "scrape_logs"
        ]
        # One log entry per scraper (12 scrapers)
        assert len(scrape_log_calls) == 12

    @pytest.mark.asyncio
    async def test_exception_from_scraper_captured(self):
        """An unhandled exception from a child scraper must be caught and logged."""
        from app.services.scrapers.multi_source_scraper import MultiSourceScraper

        supabase = _mock_supabase()
        scraper = MultiSourceScraper(supabase)

        scraper.scrapers[0].scrape_jobs_for_campaign = AsyncMock(side_effect=RuntimeError("boom"))
        for child in scraper.scrapers[1:]:
            child.scrape_jobs_for_campaign = AsyncMock(
                return_value={"scraped_count": 1, "status": "success", "job_ids": []}
            )

        result = await scraper.scrape_jobs_for_campaign(CAMPAIGN)

        assert result["status"] == "partial_success"
        assert any("boom" in e for e in result["errors"])

    @pytest.mark.asyncio
    async def test_match_score_never_null(self):
        """Every inbox_items insert must carry a non-null match_score."""
        from app.services.scrapers.multi_source_scraper import MultiSourceScraper

        supabase = _mock_supabase()
        scraper = MultiSourceScraper(supabase)

        # Capture all insert payloads
        inserted_payloads = []

        def capture_insert(payload):
            inserted_payloads.append(payload)
            return MagicMock(data=[{"id": "row-x"}])

        supabase.table.return_value.insert.side_effect = lambda p: MagicMock(
            execute=MagicMock(return_value=MagicMock(data=[{"id": "row-x"}]))
        )

        for child in scraper.scrapers:
            child.scrape_jobs_for_campaign = AsyncMock(
                return_value={"scraped_count": 0, "status": "success", "job_ids": []}
            )

        # Just validate the normalizer output from each scraper directly
        from app.services.scrapers.weworkremotely import WeWorkRemotelyScraper
        from app.services.scrapers.serper import SerperScraper
        from app.services.scrapers.crustdata import CrustdataScraper
        from app.services.scrapers.proxycurl import ProxycurlScraper

        wwr_entry = MagicMock(title="Co: Job", link="https://wwr.com/1", id="wwr-1", description="desc")
        wwr_norm = WeWorkRemotelyScraper(supabase)._normalize_job(wwr_entry, CAMPAIGN)
        assert wwr_norm["match_score"] is not None

        serper_job = {"title": "Job", "company": "Co", "location": "Remote",
                      "link": "https://li.com/1", "job_id": "li-1", "description": "desc"}
        serper_norm = SerperScraper(supabase)._normalize_job(serper_job, CAMPAIGN)
        assert serper_norm["match_score"] is not None

        cd_job = {"id": "cd-1", "title": "Job", "company": {"name": "Co"}, "location": "Remote",
                  "apply_url": "https://co.com/1", "description": "desc"}
        cd_norm = CrustdataScraper(supabase)._normalize_job(cd_job, CAMPAIGN)
        assert cd_norm["match_score"] is not None

        pc_job = {"job_title": "Job", "company_name": "Co", "location": "Remote",
                  "job_url": "https://li.com/2", "job_description": "desc"}
        pc_norm = ProxycurlScraper(supabase)._normalize_job(pc_job, CAMPAIGN)
        assert pc_norm["match_score"] is not None


# ---------------------------------------------------------------------------
# TestScraperReturnsJobIds
# ---------------------------------------------------------------------------

class TestScraperReturnsJobIds:
    @pytest.mark.asyncio
    async def test_weworkremotely_returns_job_ids(self):
        """Scraper result dict must include job_ids list after successful inserts."""
        from app.services.scrapers.weworkremotely import WeWorkRemotelyScraper

        mock_feed = MagicMock()
        mock_feed.entries = [
            MagicMock(title="Co: Job A", link="https://wwr.com/1", id="wwr-1", description="desc"),
        ]

        supabase = _mock_supabase()  # already returns data=[{"id": "row-1"}]
        scraper = WeWorkRemotelyScraper(supabase)

        with patch("asyncio.get_event_loop") as mock_loop:
            mock_loop.return_value.run_in_executor = AsyncMock(return_value=mock_feed)
            result = await scraper.scrape_jobs_for_campaign(CAMPAIGN)

        assert "job_ids" in result
        assert result["job_ids"] == ["row-1"]

    @pytest.mark.asyncio
    async def test_job_ids_empty_when_all_duplicates(self):
        """Duplicate inserts must not add IDs to job_ids."""
        from app.services.scrapers.weworkremotely import WeWorkRemotelyScraper

        mock_feed = MagicMock()
        mock_feed.entries = [
            MagicMock(title="Co: Job A", link="https://wwr.com/1", id="wwr-1", description="desc"),
        ]

        supabase = _mock_supabase()
        supabase.table.return_value.insert.return_value.execute.side_effect = [
            Exception("duplicate key value violates unique constraint"),
        ]
        scraper = WeWorkRemotelyScraper(supabase)

        with patch("asyncio.get_event_loop") as mock_loop:
            mock_loop.return_value.run_in_executor = AsyncMock(return_value=mock_feed)
            result = await scraper.scrape_jobs_for_campaign(CAMPAIGN)

        assert result["job_ids"] == []
        assert result["scraped_count"] == 0
