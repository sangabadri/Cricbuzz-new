"""
Unit tests for distributed rate limiting middleware (Slice D).
Verifies rate limiting thresholds, 429 rejection headers, fail-open policy,
anti-spoofing protection, and route exemptions.
"""

from unittest.mock import AsyncMock, patch
import pytest
from app.config import settings
from tests.conftest import AsgiTestClient, sync


@sync
async def test_rate_limiter_allows_under_limit(test_client: AsgiTestClient):
    """Requests under the public threshold are permitted with X-RateLimit headers."""
    mock_client = AsyncMock()
    mock_client.eval.return_value = [1, 59]  # 1st request, 59s TTL

    with patch("app.middleware.rate_limit.get_redis_client", return_value=mock_client):
        resp = await test_client.get("/")
        assert resp.status_code == 200
        assert resp.headers.get("x-ratelimit-limit") == str(settings.RATE_LIMIT_PUBLIC_PER_MINUTE)
        assert resp.headers.get("x-ratelimit-remaining") == str(settings.RATE_LIMIT_PUBLIC_PER_MINUTE - 1)


@sync
async def test_rate_limiter_rejects_exceeded_public_limit(test_client: AsgiTestClient):
    """Requests exceeding the threshold receive 429 Too Many Requests with dynamic Retry-After header."""
    mock_client = AsyncMock()
    mock_client.eval.return_value = [settings.RATE_LIMIT_PUBLIC_PER_MINUTE + 1, 45]  # 61st request, 45s TTL

    with patch("app.middleware.rate_limit.get_redis_client", return_value=mock_client):
        resp = await test_client.get("/")
        assert resp.status_code == 429
        assert resp.headers.get("retry-after") == "45"
        assert resp.headers.get("x-ratelimit-limit") == str(settings.RATE_LIMIT_PUBLIC_PER_MINUTE)
        assert resp.headers.get("x-ratelimit-remaining") == "0"
        assert "Rate limit exceeded" in resp.json().get("detail", "")


@sync
async def test_rate_limiter_auth_tier_lower_limit(test_client: AsgiTestClient):
    """Auth endpoints enforce the strict 10 req/min limit."""
    mock_client = AsyncMock()
    # 11th request on auth endpoint breaches limit
    mock_client.eval.return_value = [settings.RATE_LIMIT_AUTH_PER_MINUTE + 1, 30]

    with patch("app.middleware.rate_limit.get_redis_client", return_value=mock_client):
        resp = await test_client.post("/api/v1/auth/login", json={"email": "u@test.com", "password": "p"})
        assert resp.status_code == 429
        assert resp.headers.get("x-ratelimit-limit") == str(settings.RATE_LIMIT_AUTH_PER_MINUTE)
        assert resp.headers.get("x-ratelimit-remaining") == "0"
        assert resp.headers.get("retry-after") == "30"

        # Verify Redis key scoped to auth tier
        call_args = mock_client.eval.call_args[0]
        assert "cricbuzz:ratelimit:auth:" in call_args[2]


@sync
async def test_rate_limiter_exempts_health_probes(test_client: AsgiTestClient):
    """Infrastructure health endpoints (/health/live, /health/ready) are completely exempt."""
    mock_client = AsyncMock()

    with patch("app.middleware.rate_limit.get_redis_client", return_value=mock_client):
        resp = await test_client.get("/health/live")
        assert resp.status_code == 200
        # Redis eval was not even called
        mock_client.eval.assert_not_called()
        assert "x-ratelimit-limit" not in resp.headers


@sync
async def test_rate_limiter_fail_open_on_redis_error(test_client: AsgiTestClient):
    """If Redis fails or times out, middleware fails open allowing requests through."""
    mock_client = AsyncMock()
    mock_client.eval.side_effect = ConnectionError("Connection refused to Redis")

    with patch("app.middleware.rate_limit.get_redis_client", return_value=mock_client):
        resp = await test_client.get("/")
        assert resp.status_code == 200


@sync
async def test_rate_limiter_respects_x_forwarded_for_from_trusted_proxy(test_client: AsgiTestClient):
    """Rate limiter extracts client IP correctly from X-Forwarded-For when direct client is trusted."""
    mock_client = AsyncMock()
    mock_client.eval.return_value = [1, 60]

    with patch("app.middleware.rate_limit.get_redis_client", return_value=mock_client):
        # test_client connects from 127.0.0.1 (which is in TRUSTED_PROXIES)
        resp = await test_client.get(
            "/",
            headers={"X-Forwarded-For": "198.51.100.42, 10.0.0.1"},
        )
        assert resp.status_code == 200

        call_args = mock_client.eval.call_args[0]
        assert "cricbuzz:ratelimit:public:198.51.100.42" in call_args[2]


@sync
async def test_rate_limiter_exempts_scorer_mutations_and_auth_headers(test_client: AsgiTestClient):
    """Authenticated requests and scorer mutation methods (POST, PUT, etc.) are exempt from spectator IP quota."""
    mock_client = AsyncMock()

    with patch("app.middleware.rate_limit.get_redis_client", return_value=mock_client):
        # POST with Authorization header bypasses public spectator quota
        resp = await test_client.post(
            "/api/v1/teams/",
            json={"name": "Mumbai Warriors", "short_name": "MW"},
            headers={"Authorization": "Bearer fake_scorer_token"},
        )
        # Redis rate limit was NOT checked for scorer mutation
        mock_client.eval.assert_not_called()


@sync
async def test_rate_limiter_preserves_cors_headers_on_429(test_client: AsgiTestClient):
    """When a rate limit is breached, CORS headers are preserved so browsers can read the response."""
    mock_client = AsyncMock()
    mock_client.eval.return_value = [100, 25]  # Over limit, 25s remaining

    with patch("app.middleware.rate_limit.get_redis_client", return_value=mock_client):
        resp = await test_client.get(
            "/",
            headers={"Origin": "http://localhost:5173"},
        )
        assert resp.status_code == 429
        assert resp.headers.get("access-control-allow-origin") == "http://localhost:5173"
        assert resp.headers.get("retry-after") == "25"
