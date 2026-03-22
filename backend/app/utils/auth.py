import os
import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt, jwk
from jose.utils import base64url_decode
from app.utils.config import settings

_bearer = HTTPBearer(auto_error=False)

# Cache JWKS keys in-process to avoid fetching on every request
_jwks_cache: dict | None = None


def _get_jwks_url() -> str:
    url = settings.supabase_url.rstrip("/")
    return f"{url}/auth/v1/.well-known/jwks.json"


def _fetch_jwks() -> dict:
    global _jwks_cache
    if _jwks_cache is not None:
        return _jwks_cache
    resp = httpx.get(_get_jwks_url(), timeout=10)
    resp.raise_for_status()
    _jwks_cache = resp.json()
    return _jwks_cache


def _get_signing_key(token: str) -> dict:
    """Extract the matching JWK from the JWKS endpoint based on token kid."""
    headers = jwt.get_unverified_header(token)
    kid = headers.get("kid")
    jwks_data = _fetch_jwks()

    for key in jwks_data.get("keys", []):
        if key.get("kid") == kid:
            return key

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token signing key not found in JWKS.",
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> str:
    """
    Validates a Supabase-issued JWT (ES256 via JWKS) and returns the user UUID.
    Falls back to HS256 with supabase_jwt_secret if configured.
    """
    if credentials is None:
        if settings.vibeos_dev_mode:
            return settings.vibeos_dev_user_id
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header.",
        )

    if settings.vibeos_dev_mode:
        return settings.vibeos_dev_user_id

    token = credentials.credentials

    try:
        # Try ES256 via JWKS first (modern Supabase projects)
        signing_key = _get_signing_key(token)
        public_key = jwk.construct(signing_key, algorithm="ES256")

        payload = jwt.decode(
            token,
            public_key,
            algorithms=["ES256"],
            audience="authenticated",
        )
    except (JWTError, HTTPException, Exception):
        # Fall back to HS256 if JWKS fails and secret is configured
        secret = settings.supabase_jwt_secret
        if not secret:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token validation failed and no HS256 fallback configured.",
            )
        try:
            payload = jwt.decode(
                token,
                secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
        except JWTError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid or expired token: {str(e)}",
            )

    user_id: str = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing 'sub' field.",
        )
    return user_id
