import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.utils.config import settings
from jose import jwt
import time

client = TestClient(app)
TEST_SECRET = "test-secret-for-unit-tests-only"


def _make_token(secret: str, sub: str = "test-user-uuid", exp_offset: int = 3600) -> str:
    payload = {
        "sub": sub,
        "aud": "authenticated",
        "iat": int(time.time()),
        "exp": int(time.time()) + exp_offset,
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def test_valid_token_returns_200(monkeypatch):
    monkeypatch.setattr(settings, "supabase_jwt_secret", TEST_SECRET)
    token = _make_token(TEST_SECRET)
    response = client.get("/api/v1/email/inbox", headers={"Authorization": f"Bearer {token}"})
    # 200 or 500 (upstream service error) -- NOT 401 or 403
    assert response.status_code != 401
    assert response.status_code != 403


def test_missing_token_returns_403(monkeypatch):
    monkeypatch.setattr(settings, "supabase_jwt_secret", TEST_SECRET)
    response = client.get("/api/v1/email/inbox")
    assert response.status_code == 403


def test_expired_token_returns_401(monkeypatch):
    monkeypatch.setattr(settings, "supabase_jwt_secret", TEST_SECRET)
    token = _make_token(TEST_SECRET, exp_offset=-1)  # already expired
    response = client.get("/api/v1/email/inbox", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_wrong_secret_returns_401(monkeypatch):
    monkeypatch.setattr(settings, "supabase_jwt_secret", TEST_SECRET)
    token = _make_token("wrong-secret")
    response = client.get("/api/v1/email/inbox", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
