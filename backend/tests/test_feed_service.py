# backend/tests/test_feed_service.py
"""Unit tests for FeedService concert filtering — VOS-120.

Tests:
  (a) Static whitelist has expected length and includes key bands.
  (b) When artist_names is None/empty, STATIC_METAL_ARTISTS is used as the filter.
  (c) When artist_names is provided, that list is used (case-normalised) instead.
  (d) Event name matching filters correctly — partial substring match on artist name.

No external API calls are made.
"""
import unittest
from unittest.mock import AsyncMock, patch, MagicMock
import asyncio

from app.services.feed_service import FeedService, STATIC_METAL_ARTISTS


class TestStaticWhitelist(unittest.TestCase):
    def test_whitelist_is_non_trivial_length(self):
        """Static list must contain at least 50 entries."""
        self.assertGreaterEqual(len(STATIC_METAL_ARTISTS), 50)

    def test_key_bands_present(self):
        key_bands = ["metallica", "slipknot", "iron maiden", "slayer", "gojira"]
        for band in key_bands:
            self.assertIn(band, STATIC_METAL_ARTISTS, f"'{band}' missing from STATIC_METAL_ARTISTS")

    def test_no_duplicates(self):
        self.assertEqual(len(STATIC_METAL_ARTISTS), len(set(STATIC_METAL_ARTISTS)),
                         "STATIC_METAL_ARTISTS contains duplicate entries")


class TestGetConcertsFiltering(unittest.IsolatedAsyncioTestCase):
    """Integration-light: mock httpx, test filtering logic end-to-end."""

    def _make_event(self, name: str, genre: str = "Metal / Thrash Metal") -> dict:
        return {
            "name": name,
            "url": "https://example.com",
            "dates": {"start": {"localDate": "2026-06-01"}},
            "classifications": [
                {"genre": {"name": genre.split(" / ")[0]},
                 "subGenre": {"name": genre.split(" / ")[1] if " / " in genre else ""}}
            ],
            "priceRanges": [{"min": 25.0}],
            "_embedded": {
                "venues": [{"name": "Barrowland", "city": {"name": "Glasgow"}}]
            },
        }

    def _patch_ticketmaster(self, events: list):
        """Return an async context manager patch that yields the given events."""
        fake_response = MagicMock()
        fake_response.raise_for_status = MagicMock()
        fake_response.json.return_value = {"_embedded": {"events": events}}

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=fake_response)

        cm = MagicMock()
        cm.__aenter__ = AsyncMock(return_value=mock_client)
        cm.__aexit__ = AsyncMock(return_value=False)
        return cm

    async def test_no_artist_names_falls_back_to_static(self):
        """When artist_names is None, results are filtered via STATIC_METAL_ARTISTS."""
        events = [
            self._make_event("Metallica Live"),
            self._make_event("Ed Sheeran World Tour", genre="Pop / Pop"),
        ]
        svc = FeedService()
        with patch.dict("os.environ", {"TICKETMASTER_API_KEY": "fake"}):
            with patch("httpx.AsyncClient", return_value=self._patch_ticketmaster(events)):
                results = await svc.get_concerts(artist_names=None)

        names = [r["artist"] for r in results]
        self.assertIn("Metallica Live", names)
        self.assertNotIn("Ed Sheeran World Tour", names)

    async def test_artist_names_uses_caller_list_case_normalised(self):
        """When artist_names is provided, only those artists pass the filter."""
        events = [
            self._make_event("Gojira Headline Set"),
            self._make_event("Slipknot Summer Slam"),
        ]
        svc = FeedService()
        with patch.dict("os.environ", {"TICKETMASTER_API_KEY": "fake"}):
            with patch("httpx.AsyncClient", return_value=self._patch_ticketmaster(events)):
                # Pass mixed-case — service must normalise with .lower()
                results = await svc.get_concerts(artist_names=["GOJIRA"])

        names = [r["artist"] for r in results]
        self.assertIn("Gojira Headline Set", names)
        self.assertNotIn("Slipknot Summer Slam", names)

    async def test_event_name_matching_filters_correctly(self):
        """Partial substring match: 'iron maiden' in 'Iron Maiden: Legacy of the Beast'."""
        events = [
            self._make_event("Iron Maiden: Legacy of the Beast"),
            self._make_event("Some Random Band Tour"),
        ]
        svc = FeedService()
        with patch.dict("os.environ", {"TICKETMASTER_API_KEY": "fake"}):
            with patch("httpx.AsyncClient", return_value=self._patch_ticketmaster(events)):
                results = await svc.get_concerts(artist_names=["iron maiden"])

        names = [r["artist"] for r in results]
        self.assertIn("Iron Maiden: Legacy of the Beast", names)
        self.assertNotIn("Some Random Band Tour", names)


if __name__ == "__main__":
    unittest.main()
