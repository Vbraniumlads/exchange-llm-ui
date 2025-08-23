"""Tests for CCUsage API."""
import json
from fastapi.testclient import TestClient
import api

client = TestClient(api.app)


def _mock_ccusage_data():
    """Mock ccusage response data."""
    return {
        "blocks": [{
            "isActive": True,
            "costUSD": 6.4,
            "totalTokens": 15827,
            "entries": 180,
            "endTime": "2025-08-23T14:00:00.000Z",
            "burnRate": {
                "tokensPerMinuteForIndicator": 128.9,
                "costPerHour": 3.366
            }
        }]
    }


def test_status_normal(monkeypatch):
    """Test normal status response."""
    def fake_run(cmd, timeout=30):
        if cmd[:2] == ["claude", "-p"]:
            return 0, "2"
        if cmd[:3] == ["npx", "ccusage@latest", "blocks"]:
            return 0, json.dumps(_mock_ccusage_data())
        return 1, "error"

    monkeypatch.setattr(api, "_run", fake_run)

    res = client.get("/status?plan=Pro")
    assert res.status_code == 200
    data = res.json()
    assert data["plan"] == "Pro"
    assert data["limit"]["type"] == "not_limited"
    assert data["tokens"]["used"] == 15827


def test_status_limit(monkeypatch):
    """Test limit reached status."""
    def fake_run(cmd, timeout=30):
        if cmd[:2] == ["claude", "-p"]:
            return 0, "5-hour limit reached"
        if cmd[:3] == ["npx", "ccusage@latest", "blocks"]:
            return 0, json.dumps(_mock_ccusage_data())
        return 1, "error"

    monkeypatch.setattr(api, "_run", fake_run)

    res = client.get("/status?plan=Pro")
    assert res.status_code == 200
    assert res.json()["limit"]["type"] == "limit"


def test_ccusage_failure(monkeypatch):
    """Test ccusage command failure."""
    def fake_run(cmd, timeout=30):
        if cmd[:2] == ["claude", "-p"]:
            return 0, "2"
        if cmd[:3] == ["npx", "ccusage@latest", "blocks"]:
            return 1, "ccusage error"
        return 1, "error"

    monkeypatch.setattr(api, "_run", fake_run)

    res = client.get("/status?plan=Pro")
    assert res.status_code == 502


def test_health():
    """Test health endpoint."""
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"