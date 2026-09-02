from fastapi.testclient import TestClient

from lifelens.api import app


client = TestClient(app)


def test_health_reports_agent_mode() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "mode": "demo"}


def test_analysis_returns_a_confirmable_action() -> None:
    response = client.post(
        "/v1/moments/analyze",
        json={
            "event_id": "test-meal",
            "moment_type": "meal",
            "captured_at": "2026-09-01T12:38:00+09:00",
            "observations": ["mixed rice bowl visible"],
            "raw_media_retained": False,
        },
    )
    assert response.status_code == 200
    assert response.json()["proposed_action"]["requires_confirmation"] is True


def test_analysis_rejects_retained_raw_media() -> None:
    response = client.post(
        "/v1/moments/analyze",
        json={
            "event_id": "unsafe-media",
            "moment_type": "conversation",
            "captured_at": "2026-09-01T16:14:00+09:00",
            "observations": ["a promise was spoken"],
            "raw_media_retained": True,
        },
    )
    assert response.status_code == 422
    assert "derived observations" in response.json()["detail"]
