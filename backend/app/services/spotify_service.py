"""SpotifyService — per-user OAuth 2.0 + artist preference management.

Tokens are stored in users.oauth_tokens.spotify (JSONB).
Artist names are cached to users.settings.spotify_artists (text[]).
"""

import time
import logging
from typing import Optional, List, Dict, Any

import httpx

logger = logging.getLogger(__name__)

SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
SPOTIFY_API_BASE = "https://api.spotify.com/v1"
SPOTIFY_SCOPES = ["user-top-read", "user-read-private"]


class SpotifyService:
    def __init__(self, supabase_client):
        self.supabase = supabase_client

    # ------------------------------------------------------------------
    # Token helpers
    # ------------------------------------------------------------------

    def _get_stored_tokens(self, user_id: str) -> Optional[Dict[str, Any]]:
        row = (
            self.supabase.table("users")
            .select("oauth_tokens")
            .eq("id", user_id)
            .single()
            .execute()
        )
        return (row.data.get("oauth_tokens") or {}).get("spotify")

    def _save_tokens(self, user_id: str, tokens: Dict[str, Any]) -> None:
        """Merge spotify tokens into users.oauth_tokens.spotify (JSONB patch)."""
        row = (
            self.supabase.table("users")
            .select("oauth_tokens")
            .eq("id", user_id)
            .single()
            .execute()
        )
        current = row.data.get("oauth_tokens") or {}
        current["spotify"] = tokens
        self.supabase.table("users").update({"oauth_tokens": current}).eq(
            "id", user_id
        ).execute()

    def _is_token_expired(self, tokens: Dict[str, Any]) -> bool:
        expires_at = tokens.get("expires_at", 0)
        # Refresh 60 s early
        return time.time() >= (expires_at - 60)

    async def _refresh_access_token(
        self,
        user_id: str,
        refresh_token: str,
        client_id: str,
        client_secret: str,
    ) -> str:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                SPOTIFY_TOKEN_URL,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": client_id,
                    "client_secret": client_secret,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            resp.raise_for_status()
            data = resp.json()

        new_tokens = {
            "access_token": data["access_token"],
            "refresh_token": data.get("refresh_token", refresh_token),
            "expires_at": int(time.time()) + data.get("expires_in", 3600),
            "provider": "spotify",
        }
        self._save_tokens(user_id, new_tokens)
        return new_tokens["access_token"]

    async def get_valid_access_token(
        self, user_id: str, client_id: str, client_secret: str
    ) -> Optional[str]:
        tokens = self._get_stored_tokens(user_id)
        if not tokens:
            return None
        if self._is_token_expired(tokens):
            refresh_token = tokens.get("refresh_token")
            if not refresh_token:
                return None
            return await self._refresh_access_token(
                user_id, refresh_token, client_id, client_secret
            )
        return tokens.get("access_token")

    # ------------------------------------------------------------------
    # OAuth exchange
    # ------------------------------------------------------------------

    async def exchange_code(
        self,
        code: str,
        redirect_uri: str,
        client_id: str,
        client_secret: str,
    ) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                SPOTIFY_TOKEN_URL,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "client_id": client_id,
                    "client_secret": client_secret,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            resp.raise_for_status()
            return resp.json()

    # ------------------------------------------------------------------
    # Spotify API calls
    # ------------------------------------------------------------------

    async def fetch_top_artists(
        self, access_token: str, limit: int = 50
    ) -> List[str]:
        """Return a list of artist display names from user's top artists."""
        artist_names: List[str] = []
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{SPOTIFY_API_BASE}/me/top/artists",
                params={"limit": limit, "time_range": "long_term"},
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if resp.status_code == 200:
                items = resp.json().get("items", [])
                artist_names.extend(a["name"] for a in items)
            else:
                logger.warning(
                    "[SpotifyService] top/artists returned %s: %s",
                    resp.status_code,
                    resp.text[:200],
                )

        return artist_names

    # ------------------------------------------------------------------
    # Artist persistence
    # ------------------------------------------------------------------

    def save_artist_list(self, user_id: str, artist_names: List[str]) -> None:
        row = (
            self.supabase.table("users")
            .select("settings")
            .eq("id", user_id)
            .single()
            .execute()
        )
        current_settings = row.data.get("settings") or {}
        current_settings["spotify_artists"] = artist_names
        self.supabase.table("users").update({"settings": current_settings}).eq(
            "id", user_id
        ).execute()

    def get_artist_list(self, user_id: str) -> List[str]:
        row = (
            self.supabase.table("users")
            .select("settings")
            .eq("id", user_id)
            .single()
            .execute()
        )
        return (row.data.get("settings") or {}).get("spotify_artists") or []
