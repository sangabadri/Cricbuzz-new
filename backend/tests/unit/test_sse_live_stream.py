import asyncio
import json
import pytest
from app.services.event_bus import MatchEventBus
from app.routers.scorecards import sse_match_event_generator, get_live_match_stream
from tests.conftest import sync


def test_event_bus_registration_and_counts():
    """Event bus accurately tracks subscriber counts and cleans up maps on unregister."""
    bus = MatchEventBus()
    match_id = 101
    assert bus.subscriber_count(match_id) == 0

    q1 = asyncio.Queue()
    q2 = asyncio.Queue()

    bus.register(match_id, q1)
    assert bus.subscriber_count(match_id) == 1

    bus.register(match_id, q2)
    assert bus.subscriber_count(match_id) == 2

    bus.unregister(match_id, q1)
    assert bus.subscriber_count(match_id) == 1

    bus.unregister(match_id, q2)
    assert bus.subscriber_count(match_id) == 0
    assert match_id not in bus._subscribers


def test_event_bus_publish_isolation():
    """Event bus distributes payloads only to subscribers of the matching match_id."""
    bus = MatchEventBus()
    match_a = 201
    match_b = 202

    q_a1 = asyncio.Queue()
    q_a2 = asyncio.Queue()
    q_b = asyncio.Queue()

    bus.register(match_a, q_a1)
    bus.register(match_a, q_a2)
    bus.register(match_b, q_b)

    # Publish to match_a
    bus.publish(match_a, "delivery_recorded", {"ball": "0.1", "runs": 4})

    # Both match_a queues receive payload
    msg_a1 = q_a1.get_nowait()
    msg_a2 = q_a2.get_nowait()
    assert msg_a1 == {"event": "delivery_recorded", "data": {"ball": "0.1", "runs": 4}}
    assert msg_a2 == msg_a1

    # match_b queue receives nothing
    assert q_b.empty()

    bus.unregister(match_a, q_a1)
    bus.unregister(match_a, q_a2)
    bus.unregister(match_b, q_b)


def test_event_bus_queue_full_dropped_gracefully():
    """Event bus discards messages when a slow consumer's queue is full without raising QueueFull."""
    bus = MatchEventBus()
    match_id = 301
    q = asyncio.Queue(maxsize=1)
    bus.register(match_id, q)

    # Fill queue to maximum capacity
    bus.publish(match_id, "first_event", {"n": 1})
    assert q.qsize() == 1

    # Second publish exceeds maxsize; should discard without exception
    bus.publish(match_id, "second_event", {"n": 2})
    assert q.qsize() == 1

    first = q.get_nowait()
    assert first["event"] == "first_event"
    assert q.empty()

    bus.unregister(match_id, q)


@sync
async def test_sse_match_event_generator_handshake():
    """SSE generator immediately yields the connected handshake message conforming to W3C SSE standard."""
    match_id = 401
    gen = sse_match_event_generator(match_id)

    # First message is connection confirmation
    first_chunk = await anext(gen)
    assert first_chunk.startswith("event: connected\ndata: ")
    data = json.loads(first_chunk.split("data: ")[1].strip())
    assert data == {"match_id": match_id, "status": "connected"}

    await gen.aclose()


@sync
async def test_get_live_match_stream_endpoint():
    """GET /matches/{match_id}/live-stream returns StreamingResponse with proper SSE headers when match exists."""
    from unittest.mock import AsyncMock, MagicMock
    from app.models.match import Match

    match_id = 501
    mock_match_repo = MagicMock()
    mock_match_repo.get_by_id = AsyncMock(return_value=Match(id=match_id))

    response = await get_live_match_stream(match_id, match_repo=mock_match_repo)

    assert response.status_code == 200
    assert response.media_type == "text/event-stream"
    assert response.headers["Cache-Control"] == "no-cache"
    assert response.headers["Connection"] == "keep-alive"
    assert response.headers["X-Accel-Buffering"] == "no"

    # Verify initial chunk from body_iterator
    first_chunk = await anext(response.body_iterator)
    assert "event: connected" in first_chunk

    await response.body_iterator.aclose()


@sync
async def test_get_live_match_stream_not_found():
    """GET /matches/{match_id}/live-stream raises 404 HTTPException when match does not exist."""
    from unittest.mock import AsyncMock, MagicMock
    from fastapi import HTTPException

    match_id = 999999
    mock_match_repo = MagicMock()
    mock_match_repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc_info:
        await get_live_match_stream(match_id, match_repo=mock_match_repo)

    assert exc_info.value.status_code == 404
    assert f"Match with ID {match_id} not found" in exc_info.value.detail


def test_multi_pod_redis_pubsub_cross_pod_delivery():
    """Events published on Pod 1 are received across pods and delivered to Pod 2 local subscribers."""
    bus_pod1 = MatchEventBus()
    bus_pod2 = MatchEventBus()
    match_id = 601

    q_pod2 = asyncio.Queue()
    bus_pod2.register(match_id, q_pod2)

    payload_from_pod1 = json.dumps({
        "origin_pod": bus_pod1.pod_id,
        "event": "delivery_recorded",
        "data": {"ball": "1.1", "runs": 6},
    })

    dispatched = bus_pod2.handle_redis_message(match_id, payload_from_pod1)
    assert dispatched is True
    assert not q_pod2.empty()
    received = q_pod2.get_nowait()
    assert received == {"event": "delivery_recorded", "data": {"ball": "1.1", "runs": 6}}

    bus_pod2.unregister(match_id, q_pod2)


def test_redis_pubsub_ignores_own_echo():
    """Events originating from this pod are ignored by handle_redis_message to prevent duplicate local delivery."""
    bus = MatchEventBus()
    match_id = 701

    q = asyncio.Queue()
    bus.register(match_id, q)

    echo_payload = json.dumps({
        "origin_pod": bus.pod_id,  # Echo from same pod!
        "event": "score_update",
        "data": {"score": "50/1"},
    })

    dispatched = bus.handle_redis_message(match_id, echo_payload)
    assert dispatched is False
    assert q.empty()

    bus.unregister(match_id, q)


@sync
async def test_redis_listener_loop_consumes_and_dispatches():
    """_redis_listener_loop processes messages from pubsub.listen() and dispatches to local queue."""
    from unittest.mock import AsyncMock, MagicMock

    bus = MatchEventBus()
    match_id = 750
    q = asyncio.Queue()
    bus.register(match_id, q)

    mock_client = MagicMock()
    mock_pubsub = AsyncMock()
    mock_client.pubsub.return_value = mock_pubsub

    async def mock_listen():
        yield {
            "type": "message",
            "data": json.dumps({
                "origin_pod": "other_pod_id",
                "event": "wicket",
                "data": {"player": "Kohli", "type": "bowled"},
            }),
        }

    mock_pubsub.listen = mock_listen

    await bus._redis_listener_loop(match_id, mock_client)

    assert not q.empty()
    event = q.get_nowait()
    assert event == {"event": "wicket", "data": {"player": "Kohli", "type": "bowled"}}

    bus.unregister(match_id, q)


@sync
async def test_event_bus_redis_publish_failure_does_not_break_local_delivery():
    """If Redis publish fails, local subscribers still receive the event without error."""
    from unittest.mock import AsyncMock, patch

    bus = MatchEventBus()
    match_id = 801
    q = asyncio.Queue()
    bus.register(match_id, q)

    mock_client = AsyncMock()
    mock_client.publish.side_effect = ConnectionError("Redis server connection lost")

    with patch("app.services.event_bus.get_redis_client", return_value=mock_client):
        await bus.publish_async(match_id, "boundary", {"runs": 4})

        # Local queue got the message regardless
        assert not q.empty()
        event = q.get_nowait()
        assert event == {"event": "boundary", "data": {"runs": 4}}

    bus.unregister(match_id, q)

