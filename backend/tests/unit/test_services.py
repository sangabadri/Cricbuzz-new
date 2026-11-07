import functools
import pytest
from unittest.mock import AsyncMock
from app.domain.exceptions import CreaseViolationError, EntityNotFoundError, OverProgressionError, RuleViolationError
from app.models.delivery import Delivery
from app.models.innings import Innings
from app.models.match import Match
from app.models.team import Team
from app.schemas.delivery import DeliveryCreate, ManualDeliveryUpdate
from app.schemas.enums import ExtraType, InningsStatus, MatchFormat, MatchStatus, TossDecision, WicketType
from app.schemas.innings import InningsCreate
from app.schemas.match import MatchCreate, MatchToss
from app.services.delivery import DeliveryService
from app.services.innings import InningsService
from app.services.match import MatchService


def sync(async_fn):
    """Synchronous coroutine runner for mock-driven service tests without Windows socket deadlocks."""
    @functools.wraps(async_fn)
    def wrapper(*args, **kwargs):
        coro = async_fn(*args, **kwargs)
        val = None
        try:
            while True:
                val = coro.send(val)
        except StopIteration as exc:
            return exc.value
    return wrapper


@sync
async def test_match_creation_and_toss_flow():
    match_repo = AsyncMock()
    team_repo = AsyncMock()
    squad_repo = AsyncMock()

    team_repo.get_by_id.side_effect = lambda tid: Team(id=tid, name=f"Team {tid}")
    match_repo.create.side_effect = lambda m_in: Match(
        id=1,
        team_a=m_in.team_a,
        team_b=m_in.team_b,
        venue=m_in.venue,
        format=m_in.format,
        match_date=m_in.match_date,
        status=MatchStatus.SCHEDULED,
    )
    match_repo.save.side_effect = lambda m: m

    service = MatchService(match_repo, team_repo, squad_repo)

    # 1. Reject identical teams
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    with pytest.raises(RuleViolationError):
        await service.create_match(MatchCreate(team_a=1, team_b=1, venue="MCG", format=MatchFormat.T20, match_date=now))

    # 2. Valid match creation
    match = await service.create_match(MatchCreate(team_a=1, team_b=2, venue="MCG", format=MatchFormat.T20, match_date=now))
    assert match.status == MatchStatus.SCHEDULED

    # 3. Reject toss if squads are not yet submitted
    match_repo.get_by_id.return_value = match
    squad_repo.get_by_match_and_team.return_value = None
    with pytest.raises(RuleViolationError, match="Squads for both teams must be submitted"):
        await service.conduct_toss(1, MatchToss(toss_winner=1, toss_decision=TossDecision.BAT))

    # 4. Conduct toss after squads are submitted
    squad_repo.get_by_match_and_team.return_value = object()  # Mock squad present
    tossed_match = await service.conduct_toss(1, MatchToss(toss_winner=1, toss_decision=TossDecision.BAT))
    assert tossed_match.status == MatchStatus.TOSS_DONE
    assert tossed_match.toss_winner == 1
    assert tossed_match.toss_decision == TossDecision.BAT


@sync
async def test_innings_toss_connection_and_target_calculation():
    innings_repo = AsyncMock()
    match_repo = AsyncMock()
    delivery_repo = AsyncMock()

    # Match where Team 1 won toss and elected to BAT
    match = Match(
        id=1,
        team_a=1,
        team_b=2,
        venue="Wankhede",
        format=MatchFormat.T20,
        status=MatchStatus.TOSS_DONE,
        toss_winner=1,
        toss_decision=TossDecision.BAT,
    )
    match_repo.get_by_id.return_value = match

    innings_repo.get_by_match_and_number.return_value = None
    innings_repo.create.side_effect = lambda m_id, inn_in: Innings(
        id=inn_in.innings_number,
        match_id=m_id,
        innings_number=inn_in.innings_number,
        batting_team_id=inn_in.batting_team_id,
        bowling_team_id=inn_in.bowling_team_id,
        status=InningsStatus.NOT_STARTED,
        target=inn_in.target,
    )

    service = InningsService(innings_repo, match_repo, delivery_repo)

    # 1. Invalid first innings batting team (Team 2 cannot bat first when Team 1 won toss and elected to bat)
    with pytest.raises(RuleViolationError):
        await service.create_innings(
            match_id=1,
            innings_in=InningsCreate(innings_number=1, batting_team_id=2, bowling_team_id=1),
        )

    # 2. Valid first innings: Team 1 bats first
    inn1 = await service.create_innings(
        match_id=1,
        innings_in=InningsCreate(innings_number=1, batting_team_id=1, bowling_team_id=2),
    )
    assert inn1.batting_team_id == 1
    assert inn1.bowling_team_id == 2

    # Now create Innings 2: Innings 1 is completed with 150 runs
    inn1.status = InningsStatus.COMPLETED
    innings_repo.get_by_match_and_number.side_effect = lambda m_id, n: inn1 if n == 1 else None
    delivery_repo.list_by_innings.return_value = [
        Delivery(id=1, innings_id=1, over=0, ball=1, bowler_id=5, batsman_id=1, non_striker_id=2, runs=6, extra_type=None, extras=0),
        Delivery(id=2, innings_id=1, over=0, ball=2, bowler_id=5, batsman_id=1, non_striker_id=2, runs=4, extra_type=None, extras=0),
    ]

    inn2 = await service.create_innings(
        match_id=1,
        innings_in=InningsCreate(innings_number=2, batting_team_id=2, bowling_team_id=1),
    )
    # Target is auto-calculated: 6 + 4 + 1 = 11!
    assert inn2.target == 11


@sync
async def test_delivery_service_ball_event_and_match_resolution():
    delivery_repo = AsyncMock()
    innings_repo = AsyncMock()
    match_repo = AsyncMock()

    match = Match(
        id=1,
        team_a=1,
        team_b=2,
        venue="MCG",
        format=MatchFormat.T20,
        status=MatchStatus.LIVE,
    )
    # Innings 2: target is 6 runs
    innings = Innings(
        id=2,
        match_id=1,
        innings_number=2,
        batting_team_id=2,
        bowling_team_id=1,
        status=InningsStatus.IN_PROGRESS,
        target=6,
    )
    innings_repo.get_by_match_and_number.return_value = innings
    match_repo.get_by_id.return_value = match
    delivery_repo.list_by_innings.return_value = []
    delivery_repo.create.side_effect = lambda inn_id, d_in: Delivery(
        id=10,
        innings_id=inn_id,
        over=d_in.over,
        ball=d_in.ball,
        bowler_id=d_in.bowler_id,
        batsman_id=d_in.batsman_id,
        non_striker_id=d_in.non_striker_id,
        runs=d_in.runs,
        extra_type=d_in.extra_type,
        extras=d_in.extras,
        wicket_type=d_in.wicket_type,
        player_out_id=d_in.player_out_id,
        fielder_id=d_in.fielder_id,
        commentary=d_in.commentary,
    )

    service = DeliveryService(delivery_repo, innings_repo, match_repo)

    # Ball 1: 6 runs scored off the bat! Target reached immediately (6 >= 6)
    event = DeliveryCreate(
        bowler_id=10,
        runs=6,
        striker_id=1,
        non_striker_id=2,
    )

    await service.record_delivery(match_id=1, innings_number=2, delivery_in=event)

    # Innings must be COMPLETED
    assert innings.status == InningsStatus.COMPLETED
    # Match must be COMPLETED
    assert match.status == MatchStatus.COMPLETED
    # Winner must be batting team (Team 2)
    assert match.winner == 2


@sync
async def test_delivery_service_update_last_delivery():
    match_repo = AsyncMock()
    innings_repo = AsyncMock()
    delivery_repo = AsyncMock()

    innings = Innings(
        id=1,
        match_id=1,
        innings_number=1,
        batting_team_id=1,
        bowling_team_id=2,
        status=InningsStatus.IN_PROGRESS,
    )
    existing_ball = Delivery(
        id=1,
        innings_id=1,
        over=0,
        ball=1,
        bowler_id=10,
        batsman_id=20,
        non_striker_id=21,
        runs=0,
        extra_type=None,
        extras=0,
        wicket_type=None,
        player_out_id=None,
        fielder_id=None,
    )
    match = Match(
        id=1,
        team_a=1,
        team_b=2,
        venue="MCG",
        format=MatchFormat.T20,
        status=MatchStatus.LIVE,
        mom=None,
    )
    match_repo.get_by_id.return_value = match
    innings_repo.get_by_match_and_number.side_effect = lambda m_id, num: innings if num == 1 else None
    delivery_repo.get_last_delivery.return_value = existing_ball
    delivery_repo.list_by_innings.return_value = [existing_ball]
    delivery_repo.save.side_effect = lambda d: d

    service = DeliveryService(delivery_repo, innings_repo, match_repo)

    # Update with ManualDeliveryUpdate
    manual_in = ManualDeliveryUpdate(
        runs=4,
        commentary="Boundary after review",
    )
    updated2 = await service.update_last_delivery(match_id=1, innings_number=1, delivery_in=manual_in)
    assert updated2.runs == 4
    assert updated2.commentary == "Boundary after review"
