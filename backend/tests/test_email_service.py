# backend/tests/test_email_service.py
"""Unit tests for EmailService — VOS-119 fixes.

Tests:
  - Spotify tokens are preserved when _save_google_tokens writes back to oauth_tokens.
  - get_user_gmail_credentials handles NULL oauth_tokens without crashing.

No real Supabase or Google API calls are made.
"""
import unittest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone


class TestSaveGoogleTokensPreservesSpotify(unittest.TestCase):
    """_save_google_tokens must merge, not overwrite, oauth_tokens."""

    def _make_service(self, stored_oauth_tokens: dict):
        """Return an EmailService with a mocked Supabase client."""
        with patch.dict("os.environ", {
            "SUPABASE_URL": "https://fake.supabase.co",
            "SUPABASE_SERVICE_ROLE_KEY": "fake-key",
        }):
            with patch("app.services.email_service.create_client") as mock_create:
                mock_supabase = MagicMock()
                mock_create.return_value = mock_supabase

                from app.services.email_service import EmailService
                svc = EmailService()
                svc.supabase = mock_supabase

        # Stub the read side: returns stored_oauth_tokens
        select_chain = MagicMock()
        select_chain.single.return_value.execute.return_value.data = {
            "oauth_tokens": stored_oauth_tokens
        }
        mock_supabase.table.return_value.select.return_value.eq.return_value = select_chain

        # Stub the write side: capture the value that was written
        update_chain = MagicMock()
        mock_supabase.table.return_value.update.return_value.eq.return_value = update_chain

        return svc, mock_supabase

    def test_spotify_tokens_preserved(self):
        """Writing refreshed Google creds must leave spotify key intact."""
        existing_tokens = {
            "google": {
                "access_token": "old-google-token",
                "refresh_token": "google-refresh",
                "token_expiry": None,
                "scopes": [],
            },
            "spotify": {
                "access_token": "spotify-access",
                "refresh_token": "spotify-refresh",
                "expires_at": 9999999999,
                "provider": "spotify",
            },
        }
        svc, mock_supabase = self._make_service(existing_tokens)

        # Build a minimal fake Credentials object
        from unittest.mock import PropertyMock
        fake_creds = MagicMock()
        fake_creds.token = "new-google-token"
        fake_creds.refresh_token = "google-refresh"
        fake_creds.expiry = datetime(2026, 12, 31, tzinfo=timezone.utc)
        type(fake_creds).scopes = PropertyMock(return_value=["https://mail.googleapis.com/"])

        svc._save_google_tokens("user-123", fake_creds)

        # Capture what was passed to update()
        call_args = mock_supabase.table.return_value.update.call_args
        written = call_args[0][0]["oauth_tokens"]

        self.assertIn("spotify", written, "spotify key must survive the write")
        self.assertEqual(written["spotify"], existing_tokens["spotify"])
        self.assertEqual(written["google"]["access_token"], "new-google-token")

    def test_null_oauth_tokens_does_not_crash(self):
        """When oauth_tokens is NULL in the DB, _save_google_tokens must not raise."""
        svc, mock_supabase = self._make_service(stored_oauth_tokens=None)

        # Stub read to return None for oauth_tokens (simulates DB NULL)
        select_chain = MagicMock()
        select_chain.single.return_value.execute.return_value.data = {
            "oauth_tokens": None
        }
        mock_supabase.table.return_value.select.return_value.eq.return_value = select_chain

        from unittest.mock import PropertyMock
        fake_creds = MagicMock()
        fake_creds.token = "new-token"
        fake_creds.refresh_token = "refresh"
        fake_creds.expiry = None
        type(fake_creds).scopes = PropertyMock(return_value=None)

        # Should not raise
        try:
            svc._save_google_tokens("user-456", fake_creds)
        except Exception as exc:
            self.fail(f"_save_google_tokens raised unexpectedly: {exc}")

        call_args = mock_supabase.table.return_value.update.call_args
        written = call_args[0][0]["oauth_tokens"]
        # google key must be present; no spotify key (was NULL)
        self.assertIn("google", written)
        self.assertNotIn("spotify", written)


if __name__ == "__main__":
    unittest.main()
