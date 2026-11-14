from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
import pytest
from app.domain.enums import MatchFormat, MatchStatus
from app.models.match import Match
from app.models.innings import Innings
from app.models.team import Team
from app.models.player import Player
from app.schemas.enums import InningsStatus
from app.schemas.match import MatchMOM
from app.schemas.scorecard import MatchScorecardResponse
from app.services.scorecard import ScorecardService
from app.services.scorecard_cache import ScorecardCache
from app.services.match import MatchService
from tests.conftest import sync


def _make_dummy_scorecard(match_id: int, status: MatchStatus = MatchStatus.COMPLETED) -> MatchScorecardResponse:
    return MatchScorecardResponse(
        match_id=match_id,
        format=MatchFormat.T20,
        status=status,
        venue="Wankhede",
        match_date=datetime.now(timezone.utc),
        team_a_id=1,
        team_a_name="Team A",
        team_b_id=2,
        team_b_name="Team B",
        innings=[],
    )


def test_scorecard_cache_lru_eviction():
    """Cache adheres to strict bounded LRU eviction policy when capacity is reached."""
    cache = ScorecardCache(maxsize=2)
    card1 = _make_dummy_scorecard(1)
    card2 = _make_dummy_scorecard(2)
    card3 = _make_dummy_scorecard(3)

    cache.set(1, card1)
    cache.set(2, card2)
    assert cache.size() == 2

    # Access match 1, making match 2 the least recently used
    assert cache.get(1) is card1

    # Adding match 3 must evict match 2
    cache.set(3, card3)
    assert cache.size() == 2
    assert cache.get(2) is None  # Evicted
    assert cache.get(1) is card1
    assert cache.get(3) is card3


def test_scorecard_cache_hit_and_miss_metrics():
    """Cache accurately tracks hit and miss telemetry."""
    cache = ScorecardCache(maxsize=10)
    card = _make_dummy_scorecard(100)

    # Initial miss
    assert cache.get(100) is None
    assert cache.misses == 1
    assert cache.hits == 0

    # Populate and hit
    cache.set(100, card)
    assert cache.get(100) is card
    assert cache.hits == 1
    assert cache.misses == 1

    # Invalidate and miss
    cache.invalidate(100)
    assert cache.get(100) is None
    assert cache.hits == 1
    assert cache.misses == 2


@sync
async def test_cache_aside_completed_match_flow():
    """Completed match scorecards are cached on first read; subsequent reads bypass repository."""
    cache = ScorecardCache(maxsize=10)
    match_repo = MagicMock()
    innings_repo = MagicMock()
    delivery_repo = MagicMock()
    player_repo = MagicMock()
    team_repo = MagicMock()

    dummy_match = Match(
        id=10,
        format=MatchFormat.T20,
        status=MatchStatus.COMPLETED,
        venue="Eden Gardens",
        match_date=datetime.now(timezone.utc),
        team_a=1,
        team_b=2,
    )
    team_a = Team(id=1, name="Kolkata Knight Riders")
    team_b = Team(id=2, name="Mumbai Titans")

    match_repo.get_by_id = AsyncMock(return_value=dummy_match)
    innings_repo.list_by_match = AsyncMock(return_value=[])
    team_repo.get_by_ids = AsyncMock(return_value={1: team_a, 2: team_b})

    service = ScorecardService(
        match_repo=match_repo,
        innings_repo=innings_repo,
        delivery_repo=delivery_repo,
        player_repo=player_repo,
        team_repo=team_repo,
        cache=cache,
    )

    # 1. First call: Cache miss -> queries repository
    card_1 = await service.get_match_scorecard(10)
    assert card_1.match_id == 10
    assert card_1.status == MatchStatus.COMPLETED
    assert match_repo.get_by_id.await_count == 1
    assert cache.hits == 0
    assert cache.misses == 1
    assert cache.size() == 1

    # 2. Second call: Cache hit -> returns cached object without calling match_repo again
    card_2 = await service.get_match_scorecard(10)
    assert card_2.match_id == 10
    assert match_repo.get_by_id.await_count == 1  # No additional DB call!
    assert cache.hits == 1
    assert cache.misses == 1


@sync
async def test_cache_aside_live_matches_never_cached():
    """Live matches are never cached, ensuring real-time score updates are never stale."""
    cache = ScorecardCache(maxsize=10)
    match_repo = MagicMock()
    innings_repo = MagicMock()
    delivery_repo = MagicMock()
    player_repo = MagicMock()
    team_repo = MagicMock()

    live_match = Match(
        id=20,
        format=MatchFormat.T20,
        status=MatchStatus.LIVE,
        venue="Chinnaswamy",
        match_date=datetime.now(timezone.utc),
        team_a=1,
        team_b=2,
    )
    team_a = Team(id=1, name="Royal Challengers")
    team_b = Team(id=2, name="Chennai Super Kings")

    match_repo.get_by_id = AsyncMock(return_value=live_match)
    innings_repo.list_by_match = AsyncMock(return_value=[])
    team_repo.get_by_ids = AsyncMock(return_value={1: team_a, 2: team_b})

    service = ScorecardService(
        match_repo=match_repo,
        innings_repo=innings_repo,
        delivery_repo=delivery_repo,
        player_repo=player_repo,
        team_repo=team_repo,
        cache=cache,
    )

    card = await service.get_match_scorecard(20)
    assert card.status == MatchStatus.LIVE
    assert cache.size() == 0  # Not stored in cache!

    # Second call must query repository again
    await service.get_match_scorecard(20)
    assert match_repo.get_by_id.await_count == 2
    assert cache.hits == 0


@sync
async def test_cache_invalidation_on_mom_award():
    """Awarding Man of the Match invalidates the cached scorecard entry."""
    cache = ScorecardCache(maxsize=10)
    card = _make_dummy_scorecard(30)
    cache.set(30, card)
    assert cache.get(30) is not None

    match_repo = MagicMock()
    team_repo = MagicMock()
    completed_match = Match(
        id=30,
        format=MatchFormat.T20,
        status=MatchStatus.COMPLETED,
        venue="Wankhede",
        match_date=datetime.now(timezone.utc),
        team_a=1,
        team_b=2,
        mom=None,
    )
    match_repo.get_by_id = AsyncMock(return_value=completed_match)
    match_repo.save = AsyncMock(return_value=completed_match)
    team_repo.get_by_ids = AsyncMock(return_value={})

    match_service = MatchService(
        match_repo=match_repo,
        team_repo=team_repo,
        cache=cache,
    )

    await match_service.set_man_of_the_match(30, MatchMOM(player_id=99))

    # Match scorecard cache must be invalidated
    assert cache.get(30) is None


@sync
async def test_cache_invalidation_on_undo_delivery():
    """Undoing a delivery invalidates the cached scorecard entry."""
    from app.services.delivery import DeliveryService
    from app.models.delivery import Delivery

    cache = ScorecardCache(maxsize=10)
    card = _make_dummy_scorecard(40)
    cache.set(40, card)
    assert cache.get(40) is not None

    match_repo = MagicMock()
    innings_repo = MagicMock()
    delivery_repo = MagicMock()

    m = Match(id=40, format=MatchFormat.T20, status=MatchStatus.LIVE, team_a=1, team_b=2, mom=None)
    inn = Innings(
        id=400, match_id=40, innings_number=1, batting_team_id=1, bowling_team_id=2,
        status=InningsStatus.IN_PROGRESS, current_striker_id=10, current_non_striker_id=11, current_bowler_id=20
    )
    last_d = Delivery(id=1, innings_id=400, over=0, ball=1, bowler_id=20, batsman_id=10, non_striker_id=11, runs=1)

    match_repo.get_by_id = AsyncMock(return_value=m)
    innings_repo.get_by_match_and_number = AsyncMock(return_value=inn)
    innings_repo.save = AsyncMock(return_value=inn)
    delivery_repo.get_last_delivery = AsyncMock(return_value=last_d)
    delivery_repo.delete = AsyncMock(return_value=None)
    delivery_repo.list_by_innings = AsyncMock(return_value=[])

    deliv_service = DeliveryService(
        delivery_repo=delivery_repo,
        innings_repo=innings_repo,
        match_repo=match_repo,
        cache=cache,
    )

    await deliv_service.undo_last_delivery(40, 1)

    # Scorecard cache for match 40 must be evicted
    assert cache.get(40) is None


@sync
async def test_scorecard_cache_redis_l2_hit_and_local_warming():
    """Scorecard missing in local L1 is fetched from Redis L2, warms local L1, and returns valid schema."""
    from unittest.mock import patch

    cache = ScorecardCache(maxsize=10)
    match_id = 500
    card = _make_dummy_scorecard(match_id)
    raw_json = card.model_dump_json()

    mock_client = AsyncMock()
    mock_client.get.return_value = raw_json

    with patch("app.services.scorecard_cache.get_redis_client", return_value=mock_client):
        # 1. First read misses L1, hits L2 Redis
        scorecard = await cache.get_async(match_id)
        assert scorecard is not None
        assert scorecard.match_id == match_id
        assert scorecard.venue == "Wankhede"
        assert cache.hits == 1
        mock_client.get.assert_called_once_with("cricbuzz:scorecard:500")

        # 2. Subsequent synchronous read hits L1 memory without calling Redis
        mock_client.get.reset_mock()
        l1_card = cache.get(match_id)
        assert l1_card is not None
        assert l1_card.match_id == match_id
        mock_client.get.assert_not_called()


@sync
async def test_scorecard_cache_redis_l2_miss():
    """Scorecard missing in both L1 and Redis returns None and records a cache miss."""
    from unittest.mock import patch

    cache = ScorecardCache(maxsize=10)
    match_id = 501

    mock_client = AsyncMock()
    mock_client.get.return_value = None

    with patch("app.services.scorecard_cache.get_redis_client", return_value=mock_client):
        scorecard = await cache.get_async(match_id)
        assert scorecard is None
        assert cache.misses == 1
        mock_client.get.assert_called_once_with("cricbuzz:scorecard:501")


@sync
async def test_scorecard_cache_redis_set_with_ttl():
    """set_async writes serialized JSON to Redis with 24-hour (86400s) expiration."""
    from unittest.mock import patch

    cache = ScorecardCache(maxsize=10)
    match_id = 502
    card = _make_dummy_scorecard(match_id)

    mock_client = AsyncMock()

    with patch("app.services.scorecard_cache.get_redis_client", return_value=mock_client):
        await cache.set_async(match_id, card, ttl_seconds=86400)
        assert cache.size() == 1
        mock_client.set.assert_called_once()
        args, kwargs = mock_client.set.call_args
        assert args[0] == "cricbuzz:scorecard:502"
        assert "Wankhede" in args[1]
        assert kwargs["ex"] == 86400


@sync
async def test_scorecard_cache_redis_invalidation():
    """invalidate_async evicts from local memory and issues Redis delete key."""
    from unittest.mock import patch

    cache = ScorecardCache(maxsize=10)
    match_id = 503
    card = _make_dummy_scorecard(match_id)
    cache.set(match_id, card)
    assert cache.get(match_id) is not None

    mock_client = AsyncMock()

    with patch("app.services.scorecard_cache.get_redis_client", return_value=mock_client):
        await cache.invalidate_async(match_id)
        assert cache.get(match_id) is None
        mock_client.delete.assert_called_once_with("cricbuzz:scorecard:503")


@sync
async def test_scorecard_cache_redis_failure_fallback_to_l1():
    """When Redis errors or times out, cache silently falls back to local L1 without throwing."""
    from unittest.mock import patch

    cache = ScorecardCache(maxsize=10)
    match_id = 504
    card = _make_dummy_scorecard(match_id)
    cache.set(match_id, card)

    mock_client = AsyncMock()
    mock_client.get.side_effect = TimeoutError("Redis socket read timeout")

    with patch("app.services.scorecard_cache.get_redis_client", return_value=mock_client):
        # L1 still serves the cached item immediately
        scorecard = await cache.get_async(match_id)
        assert scorecard is card
        mock_client.get.assert_not_called()


def test_scorecard_cache_l1_expiration_evicts_stale():
    """L1 memory cache expires entries after l1_ttl_seconds, evicting stale data for multi-pod consistency."""
    import time

    cache = ScorecardCache(maxsize=10, l1_ttl_seconds=0.01)
    card = _make_dummy_scorecard(999)
    cache.set(999, card)

    # Initially hits L1
    assert cache.get(999) is card
    assert cache.hits == 1

    # Sleep past L1 TTL
    time.sleep(0.02)

    # Second read detects expired L1 entry and evicts
    assert cache.get(999) is None
    assert cache.misses == 1


