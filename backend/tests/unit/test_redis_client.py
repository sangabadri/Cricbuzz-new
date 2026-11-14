"""
Unit tests for Redis connection management and health checks (Slice A).
All tests execute 100% offline using mock isolation.
"""

from unittest.mock import AsyncMock, patch
import pytest
from app.config import settings
from app.services.redis_client import (
    get_redis_client,
    is_redis_healthy,
    close_redis_client,
    reset_redis_client,
)
from tests.conftest import sync


@pytest.fixture(autouse=True)
def clean_redis_state():
    """Ensure clean Redis singleton before and after each test."""
    reset_redis_client()
    original_url = settings.REDIS_URL
    yield
    reset_redis_client()
    settings.REDIS_URL = original_url


def test_redis_unconfigured_returns_none():
    """When REDIS_URL is not set, get_redis_client returns None."""
    settings.REDIS_URL = None
    client = get_redis_client()
    assert client is None


@sync
async def test_redis_unconfigured_health_returns_false():
    """When REDIS_URL is not set, is_redis_healthy returns False without errors."""
    settings.REDIS_URL = None
    healthy = await is_redis_healthy()
    assert healthy is False


def test_redis_configured_creates_client():
    """When REDIS_URL is configured, get_redis_client returns an active client instance."""
    settings.REDIS_URL = "redis://mock-redis:6379/0"
    with patch("redis.asyncio.from_url") as mock_from_url:
        mock_instance = AsyncMock()
        mock_from_url.return_value = mock_instance

        client = get_redis_client()
        assert client is mock_instance
        mock_from_url.assert_called_once_with(
            "redis://mock-redis:6379/0",
            decode_responses=True,
            socket_connect_timeout=0.5,
            socket_timeout=1.0,
        )


@sync
async def test_redis_healthy_ping_success():
    """When Redis ping returns True/PONG, is_redis_healthy returns True."""
    settings.REDIS_URL = "redis://mock-redis:6379/0"
    mock_instance = AsyncMock()
    mock_instance.ping.return_value = True

    with patch("redis.asyncio.from_url", return_value=mock_instance):
        healthy = await is_redis_healthy()
        assert healthy is True
        mock_instance.ping.assert_called_once()


@sync
async def test_redis_unhealthy_ping_exception():
    """When Redis ping raises a connection or timeout error, is_redis_healthy returns False."""
    settings.REDIS_URL = "redis://mock-redis:6379/0"
    mock_instance = AsyncMock()
    mock_instance.ping.side_effect = TimeoutError("Connection timed out after 500ms")

    with patch("redis.asyncio.from_url", return_value=mock_instance):
        healthy = await is_redis_healthy()
        assert healthy is False
        mock_instance.ping.assert_called_once()


@sync
async def test_redis_close_client_success():
    """close_redis_client calls aclose on active instance and resets singleton."""
    settings.REDIS_URL = "redis://mock-redis:6379/0"
    mock_instance = AsyncMock()

    with patch("redis.asyncio.from_url", return_value=mock_instance):
        client = get_redis_client()
        assert client is not None

        await close_redis_client()
        mock_instance.aclose.assert_called_once()
        assert get_redis_client() is not None  # Recreated on subsequent call


@sync
async def test_redis_close_when_none_is_noop():
    """Calling close_redis_client when no client is active does not raise any error."""
    settings.REDIS_URL = None
    await close_redis_client()  # Should complete without error
