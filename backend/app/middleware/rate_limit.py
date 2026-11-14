"""
Distributed rate limiting ASGI middleware using Redis atomic counters.

Enforces:
- Public spectator reads: 60 req/min per IP (GET / HEAD only).
- Auth attempts (login/register): 10 req/min per IP (POST).
- Authenticated mutations & Scorer routes: Exempt from public spectator quota to prevent NAT lockouts.
- Infrastructure probes (/health/ready, /health/live, /docs): Exempt.

Implements Fail-Open policy: If Redis is unconfigured or unreachable,
requests pass through unimpeded to guarantee zero disruption for spectators.
"""

import json
import logging
from typing import Any
from app.config import settings
from app.services.redis_client import get_redis_client

logger = logging.getLogger("cricbuzz.rate_limit")

# Atomic Lua script: increments counter and returns {current_count, remaining_ttl}
_RATE_LIMIT_LUA = """
local current = redis.call('INCR', KEYS[1])
if current == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('TTL', KEYS[1])
if ttl == -1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
    ttl = tonumber(ARGV[1])
end
return {current, ttl}
"""

EXEMPT_PREFIXES = ("/health", "/docs", "/openapi.json", "/redoc")


class DistributedRateLimitMiddleware:
    """
    Pure ASGI middleware applying distributed per-IP rate limits backed by Redis.
    Attaches X-RateLimit headers and returns HTTP 429 when threshold is breached.
    """

    def __init__(self, app: Any):
        self.app = app

    async def __call__(self, scope: dict[str, Any], receive: Any, send: Any) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # 1. Skip if rate limiting is globally disabled
        if not settings.RATE_LIMITING_ENABLED:
            await self.app(scope, receive, send)
            return

        path: str = scope.get("path", "")
        method: str = scope.get("method", "GET").upper()

        # 2. Skip infrastructure and documentation paths
        if any(path.startswith(prefix) for prefix in EXEMPT_PREFIXES):
            await self.app(scope, receive, send)
            return

        # 3. Check Redis client availability (Fail-Open policy)
        redis_conn = get_redis_client()
        if redis_conn is None:
            await self.app(scope, receive, send)
            return

        # Extract headers map
        raw_headers = scope.get("headers", [])
        headers_dict = {k.decode("latin-1").lower(): v.decode("latin-1") for k, v in raw_headers}

        # 4. Determine rate limit tier
        is_auth_route = (path.endswith("/auth/login") or path.endswith("/auth/register")) and method == "POST"
        has_auth_header = "authorization" in headers_dict

        if is_auth_route:
            tier = "auth"
            limit = settings.RATE_LIMIT_AUTH_PER_MINUTE
        elif method in ("POST", "PUT", "PATCH", "DELETE") or has_auth_header:
            # Scorer mutations & authenticated operations are exempt from the public spectator tier
            # to prevent NAT contention (e.g. 20 spectators locking out the scorer on venue Wi-Fi)
            await self.app(scope, receive, send)
            return
        elif method in ("GET", "HEAD"):
            tier = "public"
            limit = settings.RATE_LIMIT_PUBLIC_PER_MINUTE
        else:
            await self.app(scope, receive, send)
            return

        window_seconds = 60

        # Extract client IP with trusted proxy verification (Anti-Spoofing Guard)
        client_tuple = scope.get("client")
        direct_ip = client_tuple[0] if client_tuple else "127.0.0.1"

        if direct_ip in settings.TRUSTED_PROXIES:
            forwarded = headers_dict.get("x-forwarded-for")
            client_ip = forwarded.split(",")[0].strip() if forwarded else direct_ip
        else:
            client_ip = direct_ip

        redis_key = f"cricbuzz:ratelimit:{tier}:{client_ip}"

        try:
            res = await redis_conn.eval(_RATE_LIMIT_LUA, 1, redis_key, window_seconds)
            current_count = int(res[0])
            remaining_ttl = max(1, int(res[1]))
        except Exception as exc:
            # Fail-open: Redis failure must not deny service to legitimate users
            logger.warning("Redis rate limit check failed for %s: %s (failing open)", client_ip, exc)
            await self.app(scope, receive, send)
            return

        # 5. Enforce limit: Return 429 Too Many Requests if breached
        if current_count > limit:
            body = json.dumps({"detail": "Rate limit exceeded. Please try again later."}).encode("utf-8")
            response_headers = [
                (b"content-type", b"application/json"),
                (b"retry-after", str(remaining_ttl).encode("latin-1")),
                (b"x-ratelimit-limit", str(limit).encode("latin-1")),
                (b"x-ratelimit-remaining", b"0"),
                (b"content-length", str(len(body)).encode("latin-1")),
            ]
            await send({
                "type": "http.response.start",
                "status": 429,
                "headers": response_headers,
            })
            await send({
                "type": "http.response.body",
                "body": body,
            })
            return

        # 6. Process request and attach rate limit headers to response
        async def send_with_headers(message: dict[str, Any]) -> None:
            if message["type"] == "http.response.start":
                resp_headers = list(message.get("headers", []))
                resp_headers.append((b"x-ratelimit-limit", str(limit).encode("latin-1")))
                remaining = max(0, limit - current_count)
                resp_headers.append((b"x-ratelimit-remaining", str(remaining).encode("latin-1")))
                message["headers"] = resp_headers
            await send(message)

        await self.app(scope, receive, send_with_headers)
