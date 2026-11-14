"""
Redis client connection management and health checks.

Provides an asynchronous connection pool using redis.asyncio with graceful
offline fallback. When REDIS_URL is not configured or Redis is unreachable,
callers seamlessly fall back to local in-memory mechanisms.
"""

import logging
from typing import Optional
import redis.asyncio as aioredis
from app.config import settings

logger = logging.getLogger("cricbuzz.redis")

_redis_client: Optional[aioredis.Redis] = None


def get_redis_client() -> Optional[aioredis.Redis]:
    """
    Returns an async Redis client instance if REDIS_URL is configured,
    or None if Redis is disabled/unconfigured.
    """
    global _redis_client
    if not settings.REDIS_URL:
        return None

    if _redis_client is None:
        try:
            _redis_client = aioredis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=0.5,
                socket_timeout=1.0,
            )
        except Exception as exc:
            logger.warning("Failed to initialize Redis connection pool: %s", exc)
            return None

    return _redis_client


async def is_redis_healthy() -> bool:
    """
    Pings the Redis server with a short timeout to verify connectivity.
    Returns True if healthy, False if unreachable, timed out, or unconfigured.
    """
    client = get_redis_client()
    if client is None:
        return False

    try:
        response = await client.ping()
        return bool(response)
    except Exception as exc:
        logger.debug("Redis ping failed: %s", exc)
        return False


async def close_redis_client() -> None:
    """
    Closes the asynchronous Redis connection pool and releases resources.
    """
    global _redis_client
    if _redis_client is not None:
        try:
            await _redis_client.aclose()
        except Exception as exc:
            logger.warning("Error closing Redis client pool: %s", exc)
        finally:
            _redis_client = None


def reset_redis_client() -> None:
    """
    Resets the singleton reference without closing (primarily used in tests).
    """
    global _redis_client
    _redis_client = None
