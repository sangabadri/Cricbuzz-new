import pytest
from unittest.mock import AsyncMock
from app.main import app
from app.database import get_db
from tests.conftest import AsgiTestClient, sync


@sync
async def test_health_legacy_endpoint(test_client: AsgiTestClient):
    """GET /health legacy endpoint returns 200 OK for backward compatibility."""
    resp = await test_client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


@sync
async def test_health_live_endpoint(test_client: AsgiTestClient):
    """GET /health/live shallow liveness probe returns 200 alive without querying database."""
    resp = await test_client.get("/health/live")
    assert resp.status_code == 200
    assert resp.json() == {"status": "alive"}


@sync
async def test_health_ready_healthy_database(test_client: AsgiTestClient):
    """GET /health/ready deep readiness probe returns 200 when database executes SELECT 1."""
    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(return_value=None)

    async def _healthy_db():
        yield mock_session

    app.dependency_overrides[get_db] = _healthy_db
    try:
        resp = await test_client.get("/health/ready")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ready", "database": "connected"}
    finally:
        app.dependency_overrides.pop(get_db, None)


@sync
async def test_health_ready_database_failure(test_client: AsgiTestClient):
    """GET /health/ready deep readiness probe returns 503 Service Unavailable when DB is unreachable."""
    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(side_effect=Exception("Connection refused to PostgreSQL host 'db'"))

    async def _failing_db():
        yield mock_session

    app.dependency_overrides[get_db] = _failing_db
    try:
        resp = await test_client.get("/health/ready")
        assert resp.status_code == 503
        data = resp.json()
        assert data["status"] == "not_ready"
        assert data["database"] == "disconnected"
        assert "Connection refused" in data["detail"]
    finally:
        app.dependency_overrides.pop(get_db, None)
