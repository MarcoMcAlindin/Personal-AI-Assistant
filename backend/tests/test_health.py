import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.utils.config import settings
from jose import jwt
import time

client = TestClient(app)
TEST_SECRET = "test-secret-for-unit-tests-only"


def _make_token(sub: str = "test-user-uuid") -> str:
    payload = {
        "sub": sub,
        "aud": "authenticated",
        "iat": int(time.time()),
        "exp": int(time.time()) + 3600,
    }
    return jwt.encode(payload, TEST_SECRET, algorithm="HS256")


def _auth_header():
    return {"Authorization": f"Bearer {_make_token()}"}


# -- POST /health/sync --

def test_health_sync_requires_auth(monkeypatch):
    monkeypatch.setattr(settings, "supabase_jwt_secret", TEST_SECRET)
    response = client.post("/api/v1/health/sync", json={"timestamp": "2026-03-15T08:00:00Z"})
    assert response.status_code == 403


def test_health_sync_with_valid_token(monkeypatch):
    monkeypatch.setattr(settings, "supabase_jwt_secret", TEST_SECRET)
    response = client.post(
        "/api/v1/health/sync",
        headers=_auth_header(),
        json={
            "heart_rate": 72,
            "sleep_duration": 7.5,
            "avg_heart_rate": 68,
            "raw_watch_data": {"source": "Samsung Galaxy Watch 6"},
            "timestamp": "2026-03-15T08:00:00Z",
        },
    )
    # 200 if Supabase is connected, 500 if not -- NOT 401/403
    assert response.status_code != 401
    assert response.status_code != 403


# -- GET /health/metrics --

def test_health_metrics_requires_auth(monkeypatch):
    monkeypatch.setattr(settings, "supabase_jwt_secret", TEST_SECRET)
    response = client.get("/api/v1/health/metrics")
    assert response.status_code == 403


def test_health_metrics_with_valid_token(monkeypatch):
    monkeypatch.setattr(settings, "supabase_jwt_secret", TEST_SECRET)
    response = client.get("/api/v1/health/metrics", headers=_auth_header())
    assert response.status_code != 401
    assert response.status_code != 403


# -- GET /health/analysis --

def test_health_analysis_requires_auth(monkeypatch):
    monkeypatch.setattr(settings, "supabase_jwt_secret", TEST_SECRET)
    response = client.get("/api/v1/health/analysis")
    assert response.status_code == 403


def test_health_analysis_with_valid_token(monkeypatch):
    monkeypatch.setattr(settings, "supabase_jwt_secret", TEST_SECRET)
    response = client.get("/api/v1/health/analysis", headers=_auth_header())
    assert response.status_code != 401
    assert response.status_code != 403


# -- POST /health/water --

def test_health_water_requires_auth(monkeypatch):
    monkeypatch.setattr(settings, "supabase_jwt_secret", TEST_SECRET)
    response = client.post("/api/v1/health/water", json={"amount_liters": 0.25})
    assert response.status_code == 403


def test_health_water_with_valid_token(monkeypatch):
    monkeypatch.setattr(settings, "supabase_jwt_secret", TEST_SECRET)
    response = client.post(
        "/api/v1/health/water",
        headers=_auth_header(),
        json={"amount_liters": 0.25},
    )
    assert response.status_code != 401
    assert response.status_code != 403


# -- Validation --

def test_health_water_rejects_missing_amount(monkeypatch):
    monkeypatch.setattr(settings, "supabase_jwt_secret", TEST_SECRET)
    response = client.post(
        "/api/v1/health/water",
        headers=_auth_header(),
        json={},
    )
    assert response.status_code == 422
