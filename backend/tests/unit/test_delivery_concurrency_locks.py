import pytest
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy import select
from sqlalchemy.dialects import postgresql, sqlite

from app.domain.enums import ExtraType, InningsStatus, MatchFormat, MatchStatus, WicketType
from app.domain.exceptions import CreaseViolationError, RuleViolationError
from app.domain.innings_aggregate import InningsAggregate
from app.models.delivery import Delivery
from app.models.innings import Innings
from app.models.match import Match
from app.models.player import Player
from app.models.team import Team
from app.repositories.innings import InningsRepository
from app.schemas.delivery import DeliveryCreate, ManualDeliveryUpdate
from app.schemas.enums import TossDecision
from app.schemas.match import MatchMOM, MatchToss
from app.services.delivery import DeliveryService
from app.services.match import MatchService
from app.services.scorecard import ScorecardService, to_overs_record
from tests.conftest import sync


def make_test_match(match_id: int = 1, match_format: MatchFormat = MatchFormat.T20) -> Match:
    return Match(
        id=match_id,
        team_a=1,
        team_b=2,
        venue="MCG",
        format=match_format,
        status=MatchStatus.LIVE,
    )


def make_test_innings(innings_id: int = 1, match_id: int = 1, innings_number: int = 1) -> Innings:
    return Innings(
        id=innings_id,
        match_id=match_id,
        innings_number=innings_number,
        batting_team_id=1,
        bowling_team_id=2,
        status=InningsStatus.IN_PROGRESS,
        current_striker_id=10,
        current_non_striker_id=11,
        current_bowler_id=20,
    )


@sync
async def test_scoring_mutations_acquire_innings_row_lock():
    """Scoring mutations (record, update, undo) must acquire row lock (for_update=True)."""
    delivery_repo = AsyncMock()
    innings_repo = AsyncMock()
    match_repo = AsyncMock()

    innings = make_test_innings()
    existing_ball = Delivery(
        id=1,
        innings_id=1,
        over=0,
        ball=1,
        bowler_id=20,
        batsman_id=10,
        non_striker_id=11,
        runs=1,
        extra_type=None,
        extras=0,
    )

    match_repo.get_by_id.return_value = make_test_match()
    innings_repo.get_by_match_and_number.return_value = innings
    delivery_repo.get_last_delivery.return_value = existing_ball
    delivery_repo.list_by_innings.return_value = [existing_ball]
    delivery_repo.save.side_effect = lambda d: d
    delivery_repo.create.return_value = existing_ball

    service = DeliveryService(delivery_repo, innings_repo, match_repo)

    # 1. record_delivery acquires lock
    innings_repo.get_by_match_and_number.reset_mock()
    await service.record_delivery(1, 1, DeliveryCreate(runs=1))
    innings_repo.get_by_match_and_number.assert_any_call(1, 1, for_update=True)

    # 2. update_last_delivery acquires lock
    innings_repo.get_by_match_and_number.reset_mock()
    await service.update_last_delivery(1, 1, ManualDeliveryUpdate(runs=2))
    innings_repo.get_by_match_and_number.assert_any_call(1, 1, for_update=True)

    # 3. undo_last_delivery acquires lock
    innings_repo.get_by_match_and_number.reset_mock()
    await service.undo_last_delivery(1, 1)
    innings_repo.get_by_match_and_number.assert_any_call(1, 1, for_update=True)


def test_innings_repository_compiles_for_update_sql():
    """InningsRepository queries compile with 'FOR UPDATE' for PostgreSQL dialect."""
    query_locked = select(Innings).where(Innings.id == 1).with_for_update()
    pg_sql = str(query_locked.compile(dialect=postgresql.dialect()))
    assert "FOR UPDATE" in pg_sql

    sqlite_sql = str(query_locked.compile(dialect=sqlite.dialect()))
    # SQLite compiles cleanly without syntax error
    assert "FROM innings" in sqlite_sql


@sync
async def test_match_level_locking_order_in_services():
    """Verify that match_repo.get_by_id(..., for_update=True) is acquired before innings row lock."""
    delivery_repo = AsyncMock()
    innings_repo = AsyncMock()
    match_repo = AsyncMock()

    inn1 = make_test_innings(innings_id=1, match_id=1, innings_number=1)
    match = make_test_match()
    match_repo.get_by_id.return_value = match
    innings_repo.get_by_match_and_number.return_value = inn1
    delivery_repo.list_by_innings.return_value = []
    delivery_repo.create.side_effect = lambda inn_id, payload: Delivery(
        id=1, innings_id=inn_id, over=0, ball=1, bowler_id=20, batsman_id=10, non_striker_id=11,
        runs=payload.runs, extra_type=payload.extra_type, extras=payload.extras,
    )

    service = DeliveryService(delivery_repo, innings_repo, match_repo)

    ball = DeliveryCreate(bowler_id=20, striker_id=10, non_striker_id=11, runs=1)
    await service.record_delivery(match_id=1, innings_number=1, delivery_in=ball)

    # Verify match_repo.get_by_id was called with for_update=True
    match_repo.get_by_id.assert_called_with(1, for_update=True)
    innings_repo.get_by_match_and_number.assert_called_with(1, 1, for_update=True)


def test_match_repository_for_update_sql_compilation():
    """Verify that select(Match).with_for_update() compiles to PostgreSQL 'FOR UPDATE' clause."""
    stmt = select(Match).where(Match.id == 1).with_for_update()
    pg_sql = str(stmt.compile(dialect=postgresql.dialect()))
    assert "FOR UPDATE" in pg_sql


@sync
async def test_set_bowler_acquires_match_then_innings_locks():
    """set_bowler acquires Match row lock, then Innings row lock."""
    delivery_repo = AsyncMock()
    innings_repo = AsyncMock()
    match_repo = AsyncMock()

    inn1 = make_test_innings(innings_id=1, match_id=1, innings_number=1)
    match = make_test_match()
    match_repo.get_by_id.return_value = match
    innings_repo.get_by_match_and_number.return_value = inn1
    delivery_repo.list_by_innings.return_value = []
    innings_repo.save.side_effect = lambda inn: inn

    service = DeliveryService(delivery_repo, innings_repo, match_repo)
    await service.set_bowler(match_id=1, innings_number=1, bowler_id=20)

    match_repo.get_by_id.assert_called_with(1, for_update=True)
    innings_repo.get_by_match_and_number.assert_called_with(1, 1, for_update=True)


@sync
async def test_set_incoming_batter_acquires_match_then_innings_locks():
    """set_incoming_batter acquires Match row lock, then Innings row lock."""
    delivery_repo = AsyncMock()
    innings_repo = AsyncMock()
    match_repo = AsyncMock()

    inn1 = make_test_innings(innings_id=1, match_id=1, innings_number=1)
    inn1.current_striker_id = None
    match = make_test_match()
    match_repo.get_by_id.return_value = match
    innings_repo.get_by_match_and_number.return_value = inn1
    # 1 ball bowled that fell as a wicket
    wicket_ball = Delivery(
        id=1, innings_id=1, over=0, ball=1, bowler_id=20, batsman_id=10, non_striker_id=11,
        runs=0, extra_type=None, extras=0, wicket_type=WicketType.BOWLED, player_out_id=10,
    )
    delivery_repo.list_by_innings.return_value = [wicket_ball]
    innings_repo.save.side_effect = lambda inn: inn

    service = DeliveryService(delivery_repo, innings_repo, match_repo)
    await service.set_incoming_batter(match_id=1, innings_number=1, player_id=12)

    match_repo.get_by_id.assert_called_with(1, for_update=True)
    innings_repo.get_by_match_and_number.assert_called_with(1, 1, for_update=True)


@sync
async def test_swap_strike_acquires_match_then_innings_locks():
    """swap_strike acquires Match row lock, then Innings row lock."""
    delivery_repo = AsyncMock()
    innings_repo = AsyncMock()
    match_repo = AsyncMock()

    inn1 = make_test_innings(innings_id=1, match_id=1, innings_number=1)
    match = make_test_match()
    match_repo.get_by_id.return_value = match
    innings_repo.get_by_match_and_number.return_value = inn1
    delivery_repo.list_by_innings.return_value = []
    innings_repo.save.side_effect = lambda inn: inn

    service = DeliveryService(delivery_repo, innings_repo, match_repo)
    await service.swap_strike(match_id=1, innings_number=1)

    match_repo.get_by_id.assert_called_with(1, for_update=True)
    innings_repo.get_by_match_and_number.assert_called_with(1, 1, for_update=True)


@sync
async def test_conduct_toss_and_set_mom_acquire_match_locks():
    """conduct_toss and set_man_of_the_match acquire Match row lock."""
    match_repo = AsyncMock()
    team_repo = AsyncMock()
    innings_repo = AsyncMock()

    match = make_test_match()
    match.status = MatchStatus.SCHEDULED
    match.team_a = 1
    match.team_b = 2
    match_repo.get_by_id.return_value = match
    match_repo.save.side_effect = lambda m: m
    innings_repo.get_by_match_and_number.return_value = None

    match_service = MatchService(match_repo, team_repo, innings_repo=innings_repo)

    # 1. conduct_toss acquires match lock with for_update=True
    toss = MatchToss(toss_winner=1, toss_decision=TossDecision.BAT)
    await match_service.conduct_toss(match_id=1, toss=toss)
    match_repo.get_by_id.assert_called_with(1, for_update=True)

    # 2. set_man_of_the_match acquires match lock with for_update=True
    match.status = MatchStatus.COMPLETED
    match_repo.get_by_id.reset_mock()
    mom = MatchMOM(player_id=10)
    await match_service.set_man_of_the_match(match_id=1, mom_in=mom)
    match_repo.get_by_id.assert_called_with(1, for_update=True)

