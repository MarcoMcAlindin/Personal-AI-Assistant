# backend/tests/test_tasks.py
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
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


def test_parse_voice_requires_auth(monkeypatch):
    monkeypatch.setattr(settings, "supabase_jwt_secret", TEST_SECRET)
    monkeypatch.setattr(settings, "vibeos_dev_mode", False)
    response = client.post(
        "/api/v1/tasks/parse-voice",
        json={"transcript": "Call the accountant tomorrow"},
    )
    assert response.status_code == 401


def test_parse_voice_returns_structured_fields(monkeypatch):
    monkeypatch.setattr(settings, "supabase_jwt_secret", TEST_SECRET)

    mock_http_response = MagicMock()
    mock_http_response.status_code = 200
    mock_http_response.json.return_value = {
        "choices": [{"message": {"content": '{"title":"Call the accountant","description":null,"urgency":"high","time":null}'}}]
    }
    mock_http_response.raise_for_status = MagicMock()

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_http_response):
        response = client.post(
            "/api/v1/tasks/parse-voice",
            headers=_auth_header(),
            json={"transcript": "Call the accountant, it's really important"},
        )
    assert response.status_code == 200
    data = response.json()
    assert "title" in data
    assert "urgency" in data
    assert "description" in data
    assert "time" in data


def test_parse_voice_rejects_empty_transcript(monkeypatch):
    monkeypatch.setattr(settings, "supabase_jwt_secret", TEST_SECRET)
    response = client.post(
        "/api/v1/tasks/parse-voice",
        headers=_auth_header(),
        json={"transcript": ""},
    )
    assert response.status_code == 422
