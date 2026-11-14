"""
Cricket Invariants & Domain Boundary Regression Tests.

Validates core cricket rules, crease state invariants, innings lifecycle guards,
and authorization protections against edge cases and regression.
"""

import pytest
from unittest.mock import AsyncMock
from datetime import datetime, timezone
from app.domain.crease import CreaseState
from app.domain.enums import ExtraType, InningsStatus, MatchFormat, MatchStatus, MatchUserRole, WicketType
from app.domain.exceptions import CreaseViolationError, EntityNotFoundError, OverProgressionError, RuleViolationError
from app.domain.innings_aggregate import InningsAggregate
from app.domain.rules.formats import get_format_rules
from app.models.delivery import Delivery
from app.models.innings import Innings
from app.models.match import Match
from app.models.match_access import MatchAccess
from app.models.player import Player
from app.models.team import Team
from app.models.user import User
from app.schemas.delivery import DeliveryCreate
from app.schemas.innings import InningsCreate
from app.schemas.scorecard import LiveMatchResponse
from app.services.delivery import DeliveryService
from app.services.innings import InningsService
from app.services.match_access import MatchAccessService
from app.services.scorecard import ScorecardService
from tests.conftest import sync


def test_end_of_over_dismissal_strike_rotation_deferred_and_immediate():
    """
    When a wicket falls on ball 6, whether new batter is assigned immediately
    or deferred via assign_incoming_batter, strike rotates correctly so surviving non-striker
    is on strike for the next over.
    """
    # Case A: new_batter_id provided immediately on ball 6
    agg_immediate = InningsAggregate(1, 1, get_format_rules("t20"))
    agg_immediate.crease.initialize(striker_id=1, non_striker_id=2)
    for _ in range(5):
        agg_immediate.record_ball(bowler_id=10, runs=0)
    # Ball 6: striker 1 is out, new batter 3 immediately set
    agg_immediate.record_ball(bowler_id=10, runs=0, wicket_type=WicketType.BOWLED, new_batter_id=3)
    assert agg_immediate.crease.striker_id == 2
    assert agg_immediate.crease.non_striker_id == 3

    # Case B: new_batter_id NOT provided immediately (standard 2-step flow)
    agg_deferred = InningsAggregate(1, 1, get_format_rules("t20"))
    agg_deferred.crease.initialize(striker_id=1, non_striker_id=2)
    for _ in range(5):
        agg_deferred.record_ball(bowler_id=10, runs=0)
    # Ball 6: striker 1 is out, new batter is None
    agg_deferred.record_ball(bowler_id=10, runs=0, wicket_type=WicketType.BOWLED, new_batter_id=None)
    # Crease rotated ends: vacant spot is at non-striker end, batter 2 is at striker end
    assert agg_deferred.crease.striker_id == 2
    assert agg_deferred.crease.non_striker_id is None
    # Scorer assigns incoming batter 3
    agg_deferred.crease.assign_incoming_batter(3)

    # Both cases match: surviving non-striker 2 is on strike, new batter 3 is at non-striker end!
    assert agg_deferred.crease.striker_id == 2
    assert agg_deferred.crease.non_striker_id == 3


def test_runs_off_bat_disallowed_on_direct_dismissals():
    """
    InningsAggregate.validate_delivery_state rejects runs off the bat
    when wicket_type is BOWLED, LBW, CAUGHT, STUMPED, or HIT_WICKET.
    """
    agg = InningsAggregate(1, 1, get_format_rules("t20"))
    agg.crease.initialize(striker_id=1, non_striker_id=2)

    # Recording runs off the bat while being BOWLED must be rejected
    with pytest.raises(RuleViolationError, match="Runs off the bat cannot be scored for a bowled dismissal"):
        agg.record_ball(bowler_id=10, runs=6, wicket_type=WicketType.BOWLED, new_batter_id=3)

    with pytest.raises(RuleViolationError, match="Runs off the bat cannot be scored for a lbw dismissal"):
        agg.record_ball(bowler_id=10, runs=1, wicket_type=WicketType.LBW, new_batter_id=3)

    with pytest.raises(RuleViolationError, match="Runs off the bat cannot be scored for a caught dismissal"):
        agg.record_ball(bowler_id=10, runs=4, wicket_type=WicketType.CAUGHT, fielder_id=5, new_batter_id=3)


def test_all_out_resets_awaiting_new_batter():
    """
    When 10th wicket falls with new_batter_id=None,
    awaiting_new_batter is reset to False since innings is completed.
    """
    agg = InningsAggregate(1, 1, get_format_rules("t20"))
    agg.crease.initialize(striker_id=1, non_striker_id=2)
    bowlers = [10, 20]
    for w in range(3, 12):
        b = bowlers[agg.current_over % 2]
        agg.record_ball(bowler_id=b, runs=0, wicket_type=WicketType.BOWLED, new_batter_id=w)

    # 10th wicket falls with new_batter_id=None
    b = bowlers[agg.current_over % 2]
    agg.record_ball(bowler_id=b, runs=0, wicket_type=WicketType.BOWLED, new_batter_id=None)

    assert agg.is_completed is True
    assert agg.total_wickets == 10
    assert agg.crease.awaiting_new_batter is False


@sync
async def test_create_innings_rejected_on_completed_match_and_exceeding_format_limit():
    """
    InningsService.create_innings rejects innings creation
    if match is COMPLETED or if format innings limit (2 for T20) is exceeded.
    """
    innings_repo = AsyncMock()
    match_repo = AsyncMock()
    delivery_repo = AsyncMock()

    # Completed T20 match
    match = Match(
        id=1,
        team_a=1,
        team_b=2,
        venue="MCG",
        format=MatchFormat.T20,
        status=MatchStatus.COMPLETED,
        toss_winner=1,
        toss_decision="bat",
    )
    match_repo.get_by_id.return_value = match

    service = InningsService(innings_repo, match_repo, delivery_repo)

    # 1. Reject on COMPLETED match
    with pytest.raises(RuleViolationError, match="Match is already completed"):
        await service.create_innings(
            match_id=1,
            innings_in=InningsCreate(innings_number=3, batting_team_id=1, bowling_team_id=2),
        )

    # 2. Reject exceeding format innings limit (e.g. T20 supports 2 innings)
    match.status = MatchStatus.INNINGS_BREAK
    inn1 = Innings(id=1, match_id=1, innings_number=1, batting_team_id=1, bowling_team_id=2, status=InningsStatus.COMPLETED)
    inn2 = Innings(id=2, match_id=1, innings_number=2, batting_team_id=2, bowling_team_id=1, status=InningsStatus.COMPLETED)
    innings_repo.get_by_match_and_number.side_effect = lambda m_id, n, **kwargs: (
        inn1 if n == 1 else (inn2 if n == 2 else None)
    )

    with pytest.raises(RuleViolationError, match="only supports 2 innings"):
        await service.create_innings(
            match_id=1,
            innings_in=InningsCreate(innings_number=3, batting_team_id=1, bowling_team_id=2),
        )


@sync
async def test_demoting_sole_match_owner_rejected():
    """
    grant_match_access rejects demoting the sole owner of the match.
    """
    match_access_repo = AsyncMock()
    match_repo = AsyncMock()
    user_repo = AsyncMock()

    match = Match(id=1, team_a=1, team_b=2, status=MatchStatus.SCHEDULED)
    match_repo.get_by_id.return_value = match

    owner_user = User(id=42, username="owner_bob", is_active=True)
    user_repo.get_by_username.return_value = owner_user

    # Bob is currently an OWNER and the only grant on the match
    match_access_repo.get_user_match_role.return_value = MatchUserRole.OWNER
    match_access_repo.list_for_match.return_value = [
        (MatchAccess(id=1, match_id=1, user_id=42, role=MatchUserRole.OWNER), "owner_bob")
    ]

    service = MatchAccessService(match_access_repo, match_repo, user_repo)

    # Demoting the sole owner must raise RuleViolationError
    with pytest.raises(RuleViolationError, match="Cannot demote the sole owner of the match"):
        await service.grant_match_access(
            match_id=1,
            target_username="owner_bob",
            role=MatchUserRole.SCORER,
            granted_by_id=42,
        )


@sync
async def test_live_bowler_maidens_accurately_computed():
    """
    ScorecardService.get_live_match_state accurately computes maidens for LiveBowler.
    """
    match_repo = AsyncMock()
    innings_repo = AsyncMock()
    delivery_repo = AsyncMock()
    player_repo = AsyncMock()
    team_repo = AsyncMock()

    match = Match(id=1, team_a=1, team_b=2, venue="MCG", format="t20", status=MatchStatus.LIVE)
    match_repo.get_by_id.return_value = match

    innings = Innings(
        id=1, match_id=1, innings_number=1, batting_team_id=1, bowling_team_id=2, status=InningsStatus.IN_PROGRESS
    )
    innings_repo.list_by_match.return_value = [innings]

    # Bowler 10 bowled a complete maiden over (over 0, 6 dots)
    deliveries = [
        Delivery(
            id=i + 1,
            innings_id=1,
            over=0,
            ball=i + 1,
            bowler_id=10,
            batsman_id=1,
            non_striker_id=2,
            runs=0,
            extras=0,
            extra_type=None,
            wicket_type=None,
        )
        for i in range(6)
    ]
    delivery_repo.list_by_innings.return_value = deliveries

    teams = {1: Team(id=1, name="Team 1"), 2: Team(id=2, name="Team 2")}
    team_repo.get_by_ids.side_effect = lambda tids: {tid: teams[tid] for tid in tids if tid in teams}

    players = {
        1: Player(id=1, name="Batter 1"),
        2: Player(id=2, name="Batter 2"),
        10: Player(id=10, name="Bowler Star"),
    }
    player_repo.get_by_ids.side_effect = lambda pids: {pid: players[pid] for pid in pids if pid in players}

    service = ScorecardService(match_repo, innings_repo, delivery_repo, player_repo, team_repo)

    live_state = await service.get_live_match_state(1)
    assert live_state.current_bowler is not None
    assert live_state.current_bowler.overs.completed_overs == 1
    # Accurately computes 1 maiden!
    assert live_state.current_bowler.maidens == 1


def test_delivery_create_schema_preserves_new_batter_id():
    """
    DeliveryCreate includes new_batter_id, so it is preserved.
    """
    payload = DeliveryCreate(runs=0, wicket_type=WicketType.BOWLED, new_batter_id=15)
    assert hasattr(payload, "new_batter_id") is True
    assert payload.new_batter_id == 15
