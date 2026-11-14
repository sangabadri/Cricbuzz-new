"""
Distributed and local scorecard cache for immutable completed matches.

Implements a two-tiered Cache-Aside pattern:
- L1 Cache: In-memory bounded LRU with short TTL (30s) to guarantee cross-pod consistency.
- L2 Cache: Redis distributed key-value store (shared view across all pods with 24h TTL).
When Redis is unconfigured or unavailable, degrades gracefully to L1 in-memory LRU.
"""

import asyncio
from collections import OrderedDict
import logging
import time
from typing import Any, Optional
from app.schemas.scorecard import MatchScorecardResponse
from app.services.redis_client import get_redis_client

logger = logging.getLogger("cricbuzz.scorecard_cache")


class ScorecardCache:
    """
    Two-tiered cache for completed and abandoned match scorecards.
    Follows Cache-Aside pattern to eliminate redundant database queries
    and CPU-intensive domain aggregate recalculations.
    """

    def __init__(self, maxsize: int = 100, l1_ttl_seconds: float = 30.0):
        self.maxsize = maxsize
        self.l1_ttl_seconds = l1_ttl_seconds
        # Maps match_id -> (scorecard, expires_at_timestamp)
        self._cache: OrderedDict[int, tuple[MatchScorecardResponse, float]] = OrderedDict()
        self._hits = 0
        self._misses = 0

    @property
    def hits(self) -> int:
        """Total number of cache hits."""
        return self._hits

    @property
    def misses(self) -> int:
        """Total number of cache misses."""
        return self._misses

    def size(self) -> int:
        """Current number of items in local L1 cache."""
        return len(self._cache)

    def _set_l1(self, match_id: int, scorecard: MatchScorecardResponse) -> None:
        """Internal helper to populate local L1 memory with TTL without scheduling a Redis write."""
        if match_id in self._cache:
            self._cache.move_to_end(match_id)
        self._cache[match_id] = (scorecard, time.time() + self.l1_ttl_seconds)
        if len(self._cache) > self.maxsize:
            self._cache.popitem(last=False)

    def get(self, match_id: int) -> Optional[MatchScorecardResponse]:
        """
        Synchronously retrieves scorecard from local L1 cache if unexpired.
        Returns None on cache miss or expiration.
        """
        if match_id in self._cache:
            scorecard, expires_at = self._cache[match_id]
            if time.time() < expires_at:
                self._hits += 1
                self._cache.move_to_end(match_id)
                return scorecard
            # Expired in local memory: evict to re-check Redis / source
            self._cache.pop(match_id, None)

        self._misses += 1
        return None

    async def get_async(self, match_id: int) -> Optional[MatchScorecardResponse]:
        """
        Retrieves cached scorecard. Checks local L1 cache first.
        If missing locally or expired, queries Redis L2 distributed cache.
        On Redis hit, warms local L1 cache with 30s TTL and returns deserialized scorecard.
        """
        # 1. Local L1 cache check
        if match_id in self._cache:
            scorecard, expires_at = self._cache[match_id]
            if time.time() < expires_at:
                self._hits += 1
                self._cache.move_to_end(match_id)
                return scorecard
            self._cache.pop(match_id, None)

        # 2. Redis L2 distributed cache check
        client = get_redis_client()
        if client is not None:
            try:
                raw_json = await client.get(f"cricbuzz:scorecard:{match_id}")
                if raw_json is not None:
                    scorecard = MatchScorecardResponse.model_validate_json(raw_json)
                    # Warm local L1 cache without redundant write-back to Redis
                    self._set_l1(match_id, scorecard)
                    self._hits += 1
                    return scorecard
            except Exception as exc:
                logger.warning("Redis scorecard get failed for match %s: %s", match_id, exc)

        self._misses += 1
        return None

    def set(self, match_id: int, scorecard: MatchScorecardResponse) -> None:
        """
        Stores a scorecard in local L1 cache. Evicts LRU entry if maxsize exceeded.
        If event loop is running and Redis is configured, schedules Redis persistence.
        """
        self._set_l1(match_id, scorecard)

        client = get_redis_client()
        if client is not None:
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(self._persist_redis(client, match_id, scorecard))
            except RuntimeError:
                pass

    async def set_async(
        self,
        match_id: int,
        scorecard: MatchScorecardResponse,
        ttl_seconds: int = 86400,
    ) -> None:
        """
        Stores scorecard in local L1 cache and asynchronously persists to Redis with TTL.
        """
        self._set_l1(match_id, scorecard)

        client = get_redis_client()
        if client is not None:
            await self._persist_redis(client, match_id, scorecard, ttl_seconds)

    async def _persist_redis(
        self,
        client: Any,
        match_id: int,
        scorecard: MatchScorecardResponse,
        ttl_seconds: int = 86400,
    ) -> None:
        """Internal helper to serialize and store scorecard in Redis."""
        try:
            raw_json = scorecard.model_dump_json()
            await client.set(f"cricbuzz:scorecard:{match_id}", raw_json, ex=ttl_seconds)
        except Exception as exc:
            logger.warning("Redis scorecard persist failed for match %s: %s", match_id, exc)

    def invalidate(self, match_id: int) -> None:
        """Evicts a scorecard entry from local L1 cache and schedules Redis deletion."""
        self._cache.pop(match_id, None)

        client = get_redis_client()
        if client is not None:
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(self.invalidate_async(match_id))
            except RuntimeError:
                pass

    async def invalidate_async(self, match_id: int) -> None:
        """Evicts scorecard from local L1 cache and removes from Redis."""
        self._cache.pop(match_id, None)

        client = get_redis_client()
        if client is not None:
            try:
                await client.delete(f"cricbuzz:scorecard:{match_id}")
            except Exception as exc:
                logger.warning("Redis scorecard invalidate failed for match %s: %s", match_id, exc)

    def clear(self) -> None:
        """Clears all local L1 cached entries and resets hit/miss counters."""
        self._cache.clear()
        self._hits = 0
        self._misses = 0

    async def clear_async(self) -> None:
        """Clears local L1 cache and removes scorecard keys from Redis."""
        self.clear()
        client = get_redis_client()
        if client is not None:
            try:
                async for key in client.scan_iter("cricbuzz:scorecard:*"):
                    await client.delete(key)
            except Exception as exc:
                logger.warning("Redis scorecard clear failed: %s", exc)


# Global singleton cache instance (200 items, 30s L1 consistency TTL)
scorecard_cache = ScorecardCache(maxsize=200, l1_ttl_seconds=30.0)
