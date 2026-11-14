"""
Multi-pod Pub/Sub event bus for real-time live match updates.

Supports cross-pod broadcasting via Redis Pub/Sub (channel `cricbuzz:match:{id}`)
when Redis is configured, with resilient auto-reconnect, strong task retention,
and zero-latency in-process fallback via local asyncio.Queue instances when Redis
is unconfigured or unavailable.
"""

import asyncio
from collections import defaultdict
from collections.abc import AsyncIterator
import json
import logging
from typing import Any
import uuid
from app.services.redis_client import get_redis_client

logger = logging.getLogger("cricbuzz.event_bus")


class MatchEventBus:
    """
    Pub/Sub event bus for real-time live match updates.
    Distributes events to connected Server-Sent Events (SSE) subscriber queues,
    fanning out across multiple backend replicas via Redis Pub/Sub when available.
    """

    def __init__(self):
        # Maps match_id -> set of active asyncio.Queue instances
        self._subscribers: dict[int, set[asyncio.Queue[dict[str, Any]]]] = defaultdict(set)
        # Active Redis subscriber background tasks: match_id -> Task
        self._listener_tasks: dict[int, asyncio.Task] = {}
        # Retain strong references to background publish tasks to prevent premature Python GC
        self._background_tasks: set[asyncio.Task] = set()
        # Unique pod identifier to prevent duplicate message echo when receiving own broadcasts
        self.pod_id: str = uuid.uuid4().hex

    def register(self, match_id: int, queue: asyncio.Queue[dict[str, Any]]) -> None:
        """Registers a queue directly for receiving events."""
        is_first = len(self._subscribers[match_id]) == 0
        self._subscribers[match_id].add(queue)

        if is_first and match_id not in self._listener_tasks:
            self._start_redis_listener(match_id)

    def unregister(self, match_id: int, queue: asyncio.Queue[dict[str, Any]]) -> None:
        """Unregisters a queue and cleans up subscriber map and background listener."""
        self._subscribers[match_id].discard(queue)
        if not self._subscribers[match_id]:
            self._subscribers.pop(match_id, None)
            self._stop_redis_listener(match_id)

    def subscriber_count(self, match_id: int) -> int:
        """Returns the number of active listeners for a match."""
        return len(self._subscribers.get(match_id, set()))

    def _publish_local(self, match_id: int, event: str, data: dict[str, Any]) -> None:
        """Publishes directly to in-process subscriber queues for this match."""
        if match_id not in self._subscribers:
            return

        payload = {"event": event, "data": data}
        for queue in list(self._subscribers[match_id]):
            try:
                queue.put_nowait(payload)
            except asyncio.QueueFull:
                pass

    def handle_redis_message(self, match_id: int, raw_payload: str | dict[str, Any]) -> bool:
        """
        Processes an incoming message from Redis Pub/Sub.
        If message originated from another pod, dispatches to local subscriber queues.
        If message originated from this pod, discards it to prevent duplicate echo.
        Returns True if dispatched locally, False if discarded as self-echo or invalid.
        """
        try:
            if isinstance(raw_payload, str):
                payload = json.loads(raw_payload)
            else:
                payload = raw_payload

            # Prevent duplicate echo of own published message
            if payload.get("origin_pod") == self.pod_id:
                return False

            self._publish_local(
                match_id,
                payload.get("event", "update"),
                payload.get("data", {}),
            )
            return True
        except Exception as exc:
            logger.warning("Failed to decode Redis pubsub payload for match %s: %s", match_id, exc)
            return False

    def publish(self, match_id: int, event: str, data: dict[str, Any]) -> None:
        """
        Publishes a message to all active subscriber queues for the given match.
        Immediately dispatches to local consumers and asynchronously broadcasts to
        Redis Pub/Sub channel if configured. Retains strong task reference.
        """
        self._publish_local(match_id, event, data)

        client = get_redis_client()
        if client is not None:
            try:
                loop = asyncio.get_running_loop()
                payload = json.dumps({
                    "origin_pod": self.pod_id,
                    "event": event,
                    "data": data,
                }, default=str)
                task = loop.create_task(self._publish_to_redis(client, match_id, payload))
                self._background_tasks.add(task)
                task.add_done_callback(self._background_tasks.discard)
            except RuntimeError:
                pass

    async def publish_async(self, match_id: int, event: str, data: dict[str, Any]) -> None:
        """
        Publishes a message and awaits the Redis broadcast when called from an async context.
        """
        self._publish_local(match_id, event, data)

        client = get_redis_client()
        if client is not None:
            payload = json.dumps({
                "origin_pod": self.pod_id,
                "event": event,
                "data": data,
            }, default=str)
            await self._publish_to_redis(client, match_id, payload)

    async def _publish_to_redis(self, client: Any, match_id: int, payload: str) -> None:
        """Transmits JSON payload over Redis Pub/Sub channel."""
        try:
            channel_name = f"cricbuzz:match:{match_id}"
            await client.publish(channel_name, payload)
        except Exception as exc:
            logger.warning("Failed to publish event to Redis channel cricbuzz:match:%s: %s", match_id, exc)

    def _start_redis_listener(self, match_id: int) -> None:
        """Spawns an async task to listen to Redis Pub/Sub channel for cross-pod updates."""
        client = get_redis_client()
        if client is None:
            return

        try:
            loop = asyncio.get_running_loop()
            task = loop.create_task(self._redis_listener_loop(match_id, client))
            self._listener_tasks[match_id] = task
        except RuntimeError:
            pass

    def _stop_redis_listener(self, match_id: int) -> None:
        """Cancels the Redis Pub/Sub listener task for this match."""
        task = self._listener_tasks.pop(match_id, None)
        if task and not task.done():
            task.cancel()

    async def _redis_listener_loop(self, match_id: int, client: Any) -> None:
        """
        Background loop consuming messages from Redis Pub/Sub and distributing locally.
        Implements auto-reconnect backoff on connection drops and self-cleans on termination.
        """
        channel_name = f"cricbuzz:match:{match_id}"
        backoff = 1.0

        try:
            while self.subscriber_count(match_id) > 0:
                pubsub = client.pubsub()
                try:
                    await pubsub.subscribe(channel_name)
                    backoff = 1.0  # Reset backoff upon successful connection
                    async for msg in pubsub.listen():
                        if msg and msg.get("type") == "message":
                            raw_data = msg.get("data")
                            if isinstance(raw_data, bytes):
                                raw_data = raw_data.decode("utf-8")
                            if raw_data:
                                self.handle_redis_message(match_id, raw_data)
                except asyncio.CancelledError:
                    raise
                except Exception as exc:
                    logger.warning("Redis pubsub listener exception on %s: %s (reconnecting)", channel_name, exc)
                    try:
                        await pubsub.unsubscribe(channel_name)
                        await pubsub.aclose()
                    except Exception:
                        pass

                    if self.subscriber_count(match_id) > 0:
                        try:
                            await asyncio.sleep(min(backoff, 5.0))
                            backoff = min(backoff * 2.0, 10.0)
                        except asyncio.CancelledError:
                            raise
                else:
                    break
        except asyncio.CancelledError:
            pass
        finally:
            self._listener_tasks.pop(match_id, None)

    async def stop_all_listeners(self) -> None:
        """Stops all active Redis listener and background tasks."""
        for match_id, task in list(self._listener_tasks.items()):
            if not task.done():
                task.cancel()
        self._listener_tasks.clear()

        for task in list(self._background_tasks):
            if not task.done():
                task.cancel()
        self._background_tasks.clear()

    async def subscribe(self, match_id: int, heartbeat_seconds: float = 15.0) -> AsyncIterator[dict[str, Any]]:
        """
        Subscribes to live events for a match. Yields event dictionaries.
        Emits periodic keep-alive pings and cleans up the queue on disconnect.
        """
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=100)
        self.register(match_id, queue)

        try:
            while True:
                if heartbeat_seconds > 0:
                    try:
                        event = await asyncio.wait_for(queue.get(), timeout=heartbeat_seconds)
                        yield event
                    except asyncio.TimeoutError:
                        # Keep-alive heartbeat ping to prevent proxy / client timeout
                        yield {"event": "ping", "data": {"type": "heartbeat"}}
                else:
                    event = await queue.get()
                    yield event
        finally:
            self.unregister(match_id, queue)


# Global singleton event bus instance
match_event_bus = MatchEventBus()
