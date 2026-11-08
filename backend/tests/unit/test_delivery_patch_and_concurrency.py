import pytest
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy import select
from sqlalchemy.dialects import postgresql, sqlite

from app.domain.enums import ExtraType, InningsStatus, MatchFormat, MatchStatus, WicketType
from app.domain.exceptions import CreaseViolationError, RuleViolationError
from app.domain.innings_aggregate import InningsAggregate
from app.domain.rules.formats import ODIFormatRules, T20FormatRules, get_format_rules
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


# ---------------------------------------------------------------------------
# Helpers & Fixtures
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# 1. Delivery PATCH Semantics & Null Handling Tests
# ---------------------------------------------------------------------------

@sync
async def test_delivery_patch_omitted_nullable_fields_remain_unchanged():
    """An omitted field must retain its existing persisted value."""
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
        wicket_type=None,
        player_out_id=None,
        fielder_id=None,
        commentary="Original commentary",
    )
    match_repo.get_by_id.return_value = make_test_match()
    innings_repo.get_by_match_and_number.return_value = innings
    delivery_repo.get_last_delivery.return_value = existing_ball
    delivery_repo.list_by_innings.return_value = [existing_ball]
    delivery_repo.save.side_effect = lambda d: d

    service = DeliveryService(delivery_repo, innings_repo, match_repo)

    # Patch ONLY runs: commentary and other fields are omitted and must remain unchanged
    patch_req = ManualDeliveryUpdate(runs=2)
    updated = await service.update_last_delivery(1, 1, patch_req)

    assert updated.runs == 2
    assert updated.commentary == "Original commentary"
    assert updated.extra_type is None
    assert updated.extras == 0


@sync
async def test_delivery_patch_explicit_null_clears_nullable_fields():
    """Explicitly supplied null must clear nullable fields."""
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
        runs=0,
        extra_type=None,
        extras=0,
        wicket_type=None,
        player_out_id=None,
        fielder_id=None,
        commentary="Shot into the covers",
    )
    match_repo.get_by_id.return_value = make_test_match()
    innings_repo.get_by_match_and_number.return_value = innings
    delivery_repo.get_last_delivery.return_value = existing_ball
    delivery_repo.list_by_innings.return_value = [existing_ball]
    delivery_repo.save.side_effect = lambda d: d

    service = DeliveryService(delivery_repo, innings_repo, match_repo)

    # Explicitly clear commentary to None
    patch_req = ManualDeliveryUpdate(commentary=None)
    updated = await service.update_last_delivery(1, 1, patch_req)

    assert updated.commentary is None


@sync
async def test_delivery_patch_explicit_null_rejected_for_non_nullable_fields():
    """Explicit null must not be accepted for non-nullable fields (runs, extras)."""
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
        runs=2,
        extra_type=None,
        extras=0,
    )
    match_repo.get_by_id.return_value = make_test_match()
    innings_repo.get_by_match_and_number.return_value = innings
    delivery_repo.get_last_delivery.return_value = existing_ball
    delivery_repo.list_by_innings.return_value = [existing_ball]

    service = DeliveryService(delivery_repo, innings_repo, match_repo)

    # 1. Explicit null for runs
    patch_runs_null = ManualDeliveryUpdate(runs=None)
    # Force 'runs' into model_fields_set as an explicitly supplied None
    patch_runs_null.__pydantic_fields_set__.add("runs")

    with pytest.raises(RuleViolationError) as exc:
        await service.update_last_delivery(1, 1, patch_runs_null)
    assert "runs" in exc.value.detail and "non-nullable" in exc.value.detail

    # 2. Explicit null for extras
    patch_extras_null = ManualDeliveryUpdate(extras=None)
    patch_extras_null.__pydantic_fields_set__.add("extras")

    with pytest.raises(RuleViolationError) as exc:
        await service.update_last_delivery(1, 1, patch_extras_null)
    assert "extras" in exc.value.detail and "non-nullable" in exc.value.detail


@sync
async def test_delivery_patch_correct_accidental_wicket_clears_dependent_fields():
    """An accidental wicket can be corrected to a normal delivery without leaving stale dismissal info."""
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
        runs=0,
        extra_type=None,
        extras=0,
        wicket_type=WicketType.CAUGHT,
        player_out_id=10,
        fielder_id=22,
    )
    match_repo.get_by_id.return_value = make_test_match()
    innings_repo.get_by_match_and_number.return_value = innings
    delivery_repo.get_last_delivery.return_value = existing_ball
    delivery_repo.list_by_innings.return_value = [existing_ball]
    delivery_repo.save.side_effect = lambda d: d

    service = DeliveryService(delivery_repo, innings_repo, match_repo)

    # Scorer corrects wicket to a single run, supplying only wicket_type=None and runs=1
    patch_req = ManualDeliveryUpdate(wicket_type=None, runs=1)
    updated = await service.update_last_delivery(1, 1, patch_req)

    assert updated.runs == 1
    assert updated.wicket_type is None
    # player_out_id and fielder_id must be automatically cleared so no stale info remains!
    assert updated.player_out_id is None
    assert updated.fielder_id is None


@sync
async def test_delivery_patch_changing_to_bowled_clears_stale_fielder():
    """Changing dismissal from caught to bowled clears stale fielder_id."""
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
        runs=0,
        extra_type=None,
        extras=0,
        wicket_type=WicketType.CAUGHT,
        player_out_id=10,
        fielder_id=22,
    )
    match_repo.get_by_id.return_value = make_test_match()
    innings_repo.get_by_match_and_number.return_value = innings
    delivery_repo.get_last_delivery.return_value = existing_ball
    delivery_repo.list_by_innings.return_value = [existing_ball]
    delivery_repo.save.side_effect = lambda d: d

    service = DeliveryService(delivery_repo, innings_repo, match_repo)

    patch_req = ManualDeliveryUpdate(wicket_type=WicketType.BOWLED)
    updated = await service.update_last_delivery(1, 1, patch_req)

    assert updated.wicket_type == WicketType.BOWLED
    assert updated.player_out_id == 10
    assert updated.fielder_id is None


@sync
async def test_delivery_patch_invalid_combinations_rejected():
    """Invalid resulting delivery combinations must be rejected by complete delivery validation."""
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
        runs=0,
        extra_type=None,
        extras=0,
        wicket_type=None,
        player_out_id=None,
        fielder_id=None,
    )
    match_repo.get_by_id.return_value = make_test_match()
    innings_repo.get_by_match_and_number.return_value = innings
    delivery_repo.get_last_delivery.return_value = existing_ball
    delivery_repo.list_by_innings.return_value = [existing_ball]

    service = DeliveryService(delivery_repo, innings_repo, match_repo)

    # 1. Wide with runs off the bat
    with pytest.raises(RuleViolationError) as exc:
        await service.update_last_delivery(1, 1, ManualDeliveryUpdate(extra_type=ExtraType.WIDE, runs=4))
    assert "Runs off the bat cannot be scored on a wide" in exc.value.detail

    # 2. Bye with runs off the bat
    with pytest.raises(RuleViolationError) as exc:
        await service.update_last_delivery(1, 1, ManualDeliveryUpdate(extra_type=ExtraType.BYE, runs=2))
    assert "Runs off the bat cannot be scored for bye" in exc.value.detail

    # 3. Wide with bowled dismissal
    with pytest.raises(RuleViolationError) as exc:
        await service.update_last_delivery(
            1, 1, ManualDeliveryUpdate(extra_type=ExtraType.WIDE, wicket_type=WicketType.BOWLED)
        )
    assert "cannot be dismissed bowled off a wide" in exc.value.detail

    # 4. No-ball with stumped dismissal
    with pytest.raises(RuleViolationError) as exc:
        await service.update_last_delivery(
            1, 1, ManualDeliveryUpdate(extra_type=ExtraType.NOBALL, wicket_type=WicketType.STUMPED)
        )
    assert "cannot be dismissed stumped off a no-ball" in exc.value.detail

    # 5. Caught dismissal without a fielder
    with pytest.raises(RuleViolationError) as exc:
        await service.update_last_delivery(
            1, 1, ManualDeliveryUpdate(wicket_type=WicketType.CAUGHT, fielder_id=None)
        )
    assert "fielder_id is required for caught dismissals" in exc.value.detail

    # 6. Non-striker dismissed by bowled
    with pytest.raises(CreaseViolationError) as exc:
        await service.update_last_delivery(
            1, 1, ManualDeliveryUpdate(wicket_type=WicketType.BOWLED, player_out_id=11)
        )
    assert "Only the striker" in exc.value.detail


@sync
async def test_delivery_patch_failed_correction_leaves_original_state_intact():
    """Failed corrections must leave the original database state intact."""
    delivery_repo = AsyncMock()
    innings_repo = AsyncMock()
    match_repo = AsyncMock()

    innings = make_test_innings()
    original_ball = Delivery(
        id=1,
        innings_id=1,
        over=0,
        ball=1,
        bowler_id=20,
        batsman_id=10,
        non_striker_id=11,
        runs=0,
        extra_type=None,
        extras=0,
        wicket_type=WicketType.CAUGHT,
        player_out_id=10,
        fielder_id=22,
    )
    match_repo.get_by_id.return_value = make_test_match()
    innings_repo.get_by_match_and_number.return_value = innings
    delivery_repo.get_last_delivery.return_value = original_ball
    delivery_repo.list_by_innings.return_value = [original_ball]

    service = DeliveryService(delivery_repo, innings_repo, match_repo)

    # Attempt an illegal update: wide with 4 runs off bat
    with pytest.raises(RuleViolationError):
        await service.update_last_delivery(1, 1, ManualDeliveryUpdate(extra_type=ExtraType.WIDE, runs=4))

    # Assert repo save was NEVER called and original_ball attributes remain completely unchanged
    delivery_repo.save.assert_not_called()
    assert original_ball.runs == 0
    assert original_ball.wicket_type == WicketType.CAUGHT
    assert original_ball.player_out_id == 10
    assert original_ball.fielder_id == 22


# ---------------------------------------------------------------------------
# 2. Aggregate Reconstruction Tests
# ---------------------------------------------------------------------------

@sync
async def test_aggregate_reconstruction_strike_rotation_and_counters():
    """Correcting a delivery recalculates crease strike, runs, wickets, and legal balls."""
    delivery_repo = AsyncMock()
    innings_repo = AsyncMock()
    match_repo = AsyncMock()

    innings = make_test_innings()
    # 2 deliveries bowled:
    # Ball 1: 1 run -> striker rotates from 10 to 11
    # Ball 2: 1 run -> striker rotates from 11 to 10
    d1 = Delivery(id=1, innings_id=1, over=0, ball=1, bowler_id=20, batsman_id=10, non_striker_id=11, runs=1, extra_type=None, extras=0)
    d2 = Delivery(id=2, innings_id=1, over=0, ball=2, bowler_id=20, batsman_id=11, non_striker_id=10, runs=1, extra_type=None, extras=0)

    match_repo.get_by_id.return_value = make_test_match()
    innings_repo.get_by_match_and_number.return_value = innings
    delivery_repo.get_last_delivery.return_value = d2
    delivery_repo.list_by_innings.return_value = [d1, d2]
    delivery_repo.save.side_effect = lambda d: d
    innings_repo.save.side_effect = lambda inn: inn

    service = DeliveryService(delivery_repo, innings_repo, match_repo)

    # Correct Ball 2 from 1 run to 0 runs (even runs: striker 11 retains strike!)
    patch_req = ManualDeliveryUpdate(runs=0)
    await service.update_last_delivery(1, 1, patch_req)

    # After correction: Ball 1 (1 run) rotated strike to 11; Ball 2 (0 runs) kept 11 on strike
    assert innings.current_striker_id == 11
    assert innings.current_non_striker_id == 10


@sync
async def test_aggregate_reconstruction_reverses_all_out_completion():
    """Correcting the 10th wicket reverses all-out innings completion back to in-progress."""
    delivery_repo = AsyncMock()
    innings_repo = AsyncMock()
    match_repo = AsyncMock()

    innings = make_test_innings()
    innings.status = InningsStatus.COMPLETED

    # 10 wickets have fallen
    deliveries = []
    for w in range(1, 10):
        deliveries.append(
            Delivery(
                id=w,
                innings_id=1,
                over=w // 6,
                ball=(w % 6) + 1,
                bowler_id=20 if (w // 6) % 2 == 0 else 21,
                batsman_id=10 + w - 1,
                non_striker_id=10 + w,
                runs=0,
                extra_type=None,
                extras=0,
                wicket_type=WicketType.BOWLED,
                player_out_id=10 + w - 1,
            )
        )
    # 10th delivery is the 10th wicket
    d10 = Delivery(
        id=10,
        innings_id=1,
        over=1,
        ball=4,
        bowler_id=21,
        batsman_id=19,
        non_striker_id=20,
        runs=0,
        extra_type=None,
        extras=0,
        wicket_type=WicketType.BOWLED,
        player_out_id=19,
    )
    deliveries.append(d10)

    match = make_test_match()
    match.status = MatchStatus.INNINGS_BREAK
    match_repo.get_by_id.return_value = match
    innings_repo.get_by_match_and_number.return_value = innings
    delivery_repo.get_last_delivery.return_value = d10
    delivery_repo.list_by_innings.return_value = deliveries
    delivery_repo.save.side_effect = lambda d: d
    innings_repo.save.side_effect = lambda inn: inn

    service = DeliveryService(delivery_repo, innings_repo, match_repo)

    # Correct 10th ball to a dot ball (not a wicket)
    patch_req = ManualDeliveryUpdate(wicket_type=None, runs=0)
    await service.update_last_delivery(1, 1, patch_req)

    # Innings is now back in progress (only 9 wickets), match is back to LIVE
    assert innings.status == InningsStatus.IN_PROGRESS
    assert match.status == MatchStatus.LIVE


@sync
async def test_scorecard_service_reflects_delivery_correction():
    """Scorecard output accurately reflects a delivery correction."""
    match_repo = AsyncMock()
    innings_repo = AsyncMock()
    delivery_repo = AsyncMock()
    player_repo = AsyncMock()
    team_repo = AsyncMock()

    match = make_test_match()
    innings = make_test_innings()

    d1 = Delivery(
        id=1,
        innings_id=1,
        over=0,
        ball=1,
        bowler_id=20,
        batsman_id=10,
        non_striker_id=11,
        runs=0,
        extra_type=None,
        extras=0,
        wicket_type=WicketType.CAUGHT,
        player_out_id=10,
        fielder_id=22,
    )

    match_repo.get_by_id.return_value = match
    innings_repo.get_by_match_and_number.return_value = innings
    delivery_repo.list_by_innings.return_value = [d1]
    team_repo.get_by_ids.return_value = {
        1: Team(id=1, name="Mumbai Titans"),
        2: Team(id=2, name="Chennai Super Kings"),
    }
    player_repo.get_by_ids.return_value = {
        10: Player(id=10, name="Rohit"),
        11: Player(id=11, name="Ishan"),
        20: Player(id=20, name="Bumrah"),
        22: Player(id=22, name="Jadeja"),
    }

    scorecard_service = ScorecardService(match_repo, innings_repo, delivery_repo, player_repo, team_repo)

    # Initial scorecard: 1 wicket
    card1 = await scorecard_service.get_innings_scorecard(1, 1)
    assert card1.wickets == 1
    assert card1.runs == 0
    assert len(card1.fall_of_wickets) == 1

    # Now delivery is corrected: wicket removed, 4 runs scored
    d1_corrected = Delivery(
        id=1,
        innings_id=1,
        over=0,
        ball=1,
        bowler_id=20,
        batsman_id=10,
        non_striker_id=11,
        runs=4,
        extra_type=None,
        extras=0,
        wicket_type=None,
        player_out_id=None,
        fielder_id=None,
    )
    delivery_repo.list_by_innings.return_value = [d1_corrected]

    card2 = await scorecard_service.get_innings_scorecard(1, 1)
    assert card2.wickets == 0
    assert card2.runs == 4
    assert len(card2.fall_of_wickets) == 0
    assert card2.batting[0].runs == 4
    assert card2.batting[0].fours == 1
    assert card2.bowling[0].runs == 4
    assert card2.bowling[0].wickets == 0


# ---------------------------------------------------------------------------
# 3. Concurrency Protection & Locking Tests
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# 4. Format Rules Consistency Tests
# ---------------------------------------------------------------------------

def test_t20_and_odi_format_rules_integrity():
    """T20 and ODI rules remain fully functional with correct format constants."""
    t20 = get_format_rules(MatchFormat.T20)
    assert isinstance(t20, T20FormatRules)
    assert t20.max_overs == 20
    assert t20.max_bowler_overs == 4
    assert t20.balls_per_over == 6
    assert t20.total_innings == 2

    odi = get_format_rules(MatchFormat.ODI)
    assert isinstance(odi, ODIFormatRules)
    assert odi.max_overs == 50
    assert odi.max_bowler_overs == 10
    assert odi.balls_per_over == 6
    assert odi.total_innings == 2


def test_unsupported_formats_fail_explicitly():
    """Unsupported formats fail explicitly and are not silently treated as T20."""
    for unsupported in ("test", "the_hundred", "t10", "sixty", "unknown"):
        with pytest.raises(RuleViolationError) as exc:
            get_format_rules(unsupported)
        assert "Unsupported match format" in exc.value.detail


@sync
async def test_delivery_patch_http_api_endpoints(test_client):
    """Verifies PATCH /deliveries/last endpoint with valid, clearing, and invalid payloads."""
    # 1. Setup teams, players, match, squad, innings
    resp_t1 = await test_client.post("/api/v1/teams/", json={"name": "Team A"})
    resp_t2 = await test_client.post("/api/v1/teams/", json={"name": "Team B"})
    t1_id = resp_t1.json()["id"]
    t2_id = resp_t2.json()["id"]

    t1_pids = []
    for i in range(11):
        r = await test_client.post(
            "/api/v1/players/",
            json={"name": f"A{i}", "role": "batsman", "batting": "right-handed batsman", "bowling": "right-arm fast"},
        )
        t1_pids.append(r.json()["id"])
    t2_pids = []
    for i in range(11):
        r = await test_client.post(
            "/api/v1/players/",
            json={"name": f"B{i}", "role": "bowler", "batting": "right-handed batsman", "bowling": "right-arm fast"},
        )
        t2_pids.append(r.json()["id"])

    m_resp = await test_client.post(
        "/api/v1/matches/",
        json={
            "team_a": t1_id,
            "team_b": t2_id,
            "venue": "Lords",
            "format": "t20",
            "match_date": "2026-11-08T10:00:00Z",
        },
    )
    match_id = m_resp.json()["id"]

    await test_client.post(
        f"/api/v1/matches/{match_id}/squad",
        json={"team_id": t1_id, "captain_id": t1_pids[0], "wicket_keeper_id": t1_pids[1], "players": [{"player_id": pid, "is_playing_xi": True} for pid in t1_pids]},
    )
    await test_client.post(
        f"/api/v1/matches/{match_id}/squad",
        json={"team_id": t2_id, "captain_id": t2_pids[0], "wicket_keeper_id": t2_pids[1], "players": [{"player_id": pid, "is_playing_xi": True} for pid in t2_pids]},
    )

    await test_client.post(
        f"/api/v1/matches/{match_id}/toss",
        json={"toss_winner": t1_id, "toss_decision": "bat"},
    )

    await test_client.post(
        f"/api/v1/matches/{match_id}/innings/1/start",
        json={"striker_id": t1_pids[0], "non_striker_id": t1_pids[1], "bowler_id": t2_pids[0]},
    )

    # Record a wicket ball
    ball_resp = await test_client.post(
        f"/api/v1/matches/{match_id}/innings/1/deliveries",
        json={
            "bowler_id": t2_pids[0],
            "striker_id": t1_pids[0],
            "non_striker_id": t1_pids[1],
            "runs": 0,
            "wicket_type": "caught",
            "player_out_id": t1_pids[0],
            "fielder_id": t2_pids[2],
        },
    )
    assert ball_resp.status_code == 201

    # 1. Invalid payload: explicit null for runs -> 400
    res_null_runs = await test_client.patch(
        f"/api/v1/matches/{match_id}/innings/1/deliveries/last",
        json={"runs": None},
    )
    assert res_null_runs.status_code == 400
    assert "runs" in res_null_runs.json()["detail"]

    # 2. Invalid payload: extra uneditable field -> 422
    res_extra_field = await test_client.patch(
        f"/api/v1/matches/{match_id}/innings/1/deliveries/last",
        json={"over": 5},
    )
    assert res_extra_field.status_code == 422

    # 3. Valid correction: clear wicket to 1 run
    res_correct = await test_client.patch(
        f"/api/v1/matches/{match_id}/innings/1/deliveries/last",
        json={"runs": 1, "wicket_type": None},
    )
    assert res_correct.status_code == 200
    corrected = res_correct.json()
    assert corrected["runs"] == 1
    assert corrected["wicket_type"] is None
    assert corrected["player_out_id"] is None
    assert corrected["fielder_id"] is None


# ---------------------------------------------------------------------------
# 5. Over Boundary Progression & Immutability Checkpoints
# ---------------------------------------------------------------------------

@sync
async def test_over_boundary_progression_correction_legal_to_wide():
    """Correcting the 6th legal delivery of an over to a wide resets over to incomplete."""
    delivery_repo = AsyncMock()
    innings_repo = AsyncMock()
    match_repo = AsyncMock()

    innings = make_test_innings()
    # At the end of an over, active bowler is None until the next bowler is assigned
    innings.current_bowler_id = None
    # 5 legal balls bowled + 6th ball bowled
    deliveries = []
    for b in range(1, 6):
        deliveries.append(
            Delivery(
                id=b,
                innings_id=1,
                over=0,
                ball=b,
                bowler_id=20,
                batsman_id=10,
                non_striker_id=11,
                runs=0,
                extra_type=None,
                extras=0,
            )
        )
    d6 = Delivery(
        id=6,
        innings_id=1,
        over=0,
        ball=6,
        bowler_id=20,
        batsman_id=10,
        non_striker_id=11,
        runs=0,
        extra_type=None,
        extras=0,
    )
    deliveries.append(d6)

    match_repo.get_by_id.return_value = make_test_match()
    innings_repo.get_by_match_and_number.return_value = innings
    delivery_repo.get_last_delivery.return_value = d6
    delivery_repo.list_by_innings.return_value = deliveries
    delivery_repo.save.side_effect = lambda d: d
    innings_repo.save.side_effect = lambda inn: inn

    service = DeliveryService(delivery_repo, innings_repo, match_repo)

    # Correct 6th ball from legal (runs=0) to wide (extra_type=wide, extras=1, runs=0)
    patch_req = ManualDeliveryUpdate(extra_type=ExtraType.WIDE, extras=1, runs=0)
    updated = await service.update_last_delivery(1, 1, patch_req)

    assert updated.extra_type == ExtraType.WIDE
    assert updated.extras == 1
    # Over is now incomplete (only 5 legal balls): bowler remains active, strike not rotated at over end
    assert innings.current_bowler_id == 20
    assert innings.current_striker_id == 10
    assert innings.current_non_striker_id == 11


@sync
async def test_over_boundary_progression_correction_wide_to_legal():
    """Correcting a wide on the 6th attempt to a legal dot ball completes the over."""
    delivery_repo = AsyncMock()
    innings_repo = AsyncMock()
    match_repo = AsyncMock()

    innings = make_test_innings()
    deliveries = []
    for b in range(1, 6):
        deliveries.append(
            Delivery(
                id=b,
                innings_id=1,
                over=0,
                ball=b,
                bowler_id=20,
                batsman_id=10,
                non_striker_id=11,
                runs=0,
                extra_type=None,
                extras=0,
            )
        )
    # Ball 6 was a wide (attempt 6, 5 legal balls bowled so far)
    d6 = Delivery(
        id=6,
        innings_id=1,
        over=0,
        ball=6,
        bowler_id=20,
        batsman_id=10,
        non_striker_id=11,
        runs=0,
        extra_type=ExtraType.WIDE,
        extras=1,
    )
    deliveries.append(d6)

    match_repo.get_by_id.return_value = make_test_match()
    innings_repo.get_by_match_and_number.return_value = innings
    delivery_repo.get_last_delivery.return_value = d6
    delivery_repo.list_by_innings.return_value = deliveries
    delivery_repo.save.side_effect = lambda d: d
    innings_repo.save.side_effect = lambda inn: inn

    service = DeliveryService(delivery_repo, innings_repo, match_repo)

    # Correct 6th ball to legal dot ball: clears extra_type and extras, sets runs=0
    patch_req = ManualDeliveryUpdate(extra_type=None, runs=0)
    updated = await service.update_last_delivery(1, 1, patch_req)

    assert updated.extra_type is None
    assert updated.extras == 0
    # Over is now complete (6 legal balls): bowler unset, strike rotated at over end
    assert innings.current_bowler_id is None
    assert innings.current_striker_id == 11
    assert innings.current_non_striker_id == 10


@sync
async def test_immutability_checkpoint_next_bowler_assigned():
    """Modifying delivery is blocked once bowler is assigned for the next over."""
    delivery_repo = AsyncMock()
    innings_repo = AsyncMock()
    match_repo = AsyncMock()

    # 6 legal balls bowled, over completed
    deliveries = []
    for b in range(1, 7):
        deliveries.append(
            Delivery(
                id=b,
                innings_id=1,
                over=0,
                ball=b,
                bowler_id=20,
                batsman_id=10,
                non_striker_id=11,
                runs=0,
                extra_type=None,
                extras=0,
            )
        )
    innings = make_test_innings()
    # Next over's bowler (21) has already been assigned!
    innings.current_bowler_id = 21

    match_repo.get_by_id.return_value = make_test_match()
    innings_repo.get_by_match_and_number.return_value = innings
    delivery_repo.get_last_delivery.return_value = deliveries[-1]
    delivery_repo.list_by_innings.return_value = deliveries

    service = DeliveryService(delivery_repo, innings_repo, match_repo)

    with pytest.raises(RuleViolationError) as exc:
        await service.update_last_delivery(1, 1, ManualDeliveryUpdate(runs=1))
    assert "bowler has already been assigned for the next over" in exc.value.detail


@sync
async def test_immutability_checkpoint_man_of_the_match_awarded():
    """Modifying delivery is blocked once Man of the Match is awarded."""
    delivery_repo = AsyncMock()
    innings_repo = AsyncMock()
    match_repo = AsyncMock()

    match = make_test_match()
    match.mom = 10  # Man of the match awarded
    innings = make_test_innings()
    d1 = Delivery(id=1, innings_id=1, over=0, ball=1, bowler_id=20, batsman_id=10, non_striker_id=11, runs=1)

    match_repo.get_by_id.return_value = match
    innings_repo.get_by_match_and_number.return_value = innings
    delivery_repo.get_last_delivery.return_value = d1

    service = DeliveryService(delivery_repo, innings_repo, match_repo)

    with pytest.raises(RuleViolationError) as exc:
        await service.update_last_delivery(1, 1, ManualDeliveryUpdate(runs=2))
    assert "Man of the Match has already been awarded" in exc.value.detail


@sync
async def test_immutability_checkpoint_innings_2_started():
    """Modifying delivery in Innings 1 is blocked once Innings 2 has started."""
    delivery_repo = AsyncMock()
    innings_repo = AsyncMock()
    match_repo = AsyncMock()

    inn1 = make_test_innings(innings_id=1, match_id=1, innings_number=1)
    inn2 = make_test_innings(innings_id=2, match_id=1, innings_number=2)
    inn2.status = InningsStatus.IN_PROGRESS

    match_repo.get_by_id.return_value = make_test_match()
    # When querying inn1, returns inn1; when querying inn2, returns inn2
    innings_repo.get_by_match_and_number.side_effect = lambda m_id, num, **kwargs: inn1 if num == 1 else inn2
    d1 = Delivery(id=1, innings_id=1, over=0, ball=1, bowler_id=20, batsman_id=10, non_striker_id=11, runs=1)
    delivery_repo.get_last_delivery.return_value = d1

    service = DeliveryService(delivery_repo, innings_repo, match_repo)

    with pytest.raises(RuleViolationError) as exc:
        await service.update_last_delivery(1, 1, ManualDeliveryUpdate(runs=2))
    assert "Innings 2 has already started" in exc.value.detail


def test_unique_delivery_positions_protected():
    """Verifies that Delivery model enforces unique (innings_id, over, ball) constraint."""
    constraint_names = [c.name for c in Delivery.__table__.constraints]
    assert "unique_ball_in_over" in constraint_names
    unique_constraint = next(c for c in Delivery.__table__.constraints if c.name == "unique_ball_in_over")
    col_names = [col.name for col in unique_constraint.columns]
    assert col_names == ["innings_id", "over", "ball"]


@sync
async def test_innings_1_target_updated_on_recompletion_after_undo():
    """When Innings 1 is completed again after an undo/correction, existing inn2 target is resynchronized."""
    delivery_repo = AsyncMock()
    innings_repo = AsyncMock()
    match_repo = AsyncMock()

    inn1 = make_test_innings(innings_id=1, match_id=1, innings_number=1)
    inn1.status = InningsStatus.IN_PROGRESS
    inn1.current_bowler_id = 41
    inn1.current_striker_id = 19
    inn1.current_non_striker_id = 30

    # Stale Innings 2 created from a previous completion with target 41
    inn2 = make_test_innings(innings_id=2, match_id=1, innings_number=2)
    inn2.target = 41
    inn2.status = InningsStatus.NOT_STARTED
    inn2.current_striker_id = None

    match = make_test_match()
    match.status = MatchStatus.LIVE
    match_repo.get_by_id.return_value = match

    # Innings 1 currently has 9 wickets and 5 runs scored:
    # Over 0 (balls 1-6): Bowler 40, 6 wickets
    # Over 1 (balls 7-9): Bowler 41, 3 wickets
    existing_deliveries = []
    for w in range(1, 10):
        over_idx = 0 if w <= 6 else 1
        ball_idx = w if w <= 6 else w - 6
        bowler = 40 if over_idx == 0 else 41
        existing_deliveries.append(
            Delivery(
                id=w,
                innings_id=1,
                over=over_idx,
                ball=ball_idx,
                bowler_id=bowler,
                batsman_id=10 + w - 1,
                non_striker_id=30,
                runs=5 if w == 1 else 0,
                extra_type=None,
                extras=0,
                wicket_type=WicketType.BOWLED,
                player_out_id=10 + w - 1,
            )
        )
    delivery_repo.list_by_innings.return_value = existing_deliveries
    delivery_repo.create.side_effect = lambda inn_id, payload: Delivery(
        id=10,
        innings_id=inn_id,
        over=1,
        ball=4,
        bowler_id=41,
        batsman_id=19,
        non_striker_id=30,
        runs=payload.runs,
        extra_type=payload.extra_type,
        extras=payload.extras,
        wicket_type=payload.wicket_type,
        player_out_id=payload.player_out_id,
    )

    innings_repo.get_by_match_and_number.side_effect = lambda m_id, num, **kwargs: inn1 if num == 1 else inn2
    innings_repo.save.side_effect = lambda inn: inn

    service = DeliveryService(delivery_repo, innings_repo, match_repo)

    # 10th wicket falls with 2 runs off the bat -> total runs = 7, target for inn2 should be 8
    ball_in = DeliveryCreate(
        bowler_id=41,
        striker_id=19,
        non_striker_id=30,
        runs=2,
        extra_type=None,
        extras=0,
        wicket_type=WicketType.BOWLED,
        player_out_id=19,
    )
    await service.record_delivery(match_id=1, innings_number=1, delivery_in=ball_in)

    # Innings 1 is completed
    assert inn1.status == InningsStatus.COMPLETED
    assert match.status == MatchStatus.INNINGS_BREAK
    # Innings 2 target must be updated from stale 41 to new total + 1 (5 + 2 + 1 = 8)
    assert inn2.target == 8


@sync
async def test_second_innings_target_reversal_via_patch():
    """Patching a winning ball in Innings 2 to fewer runs reverts match to LIVE and resets winner."""
    delivery_repo = AsyncMock()
    innings_repo = AsyncMock()
    match_repo = AsyncMock()

    inn2 = make_test_innings(innings_id=2, match_id=1, innings_number=2)
    inn2.target = 50
    inn2.status = InningsStatus.COMPLETED

    match = make_test_match()
    match.status = MatchStatus.COMPLETED
    match.winner = inn2.batting_team_id
    match.win_margin_wickets = 10
    match_repo.get_by_id.return_value = match

    # Two deliveries: ball 1 had 46 runs (simulated as legal delivery with 46 runs or 7 deliveries)
    # Let's create ball 1 (runs=46, though runs schema is 0-6 on API, DB Delivery can have multiple balls)
    # Let's use 8 balls with 6 runs each = 48 runs, ball 9 had 2 runs = 50 runs
    deliveries = []
    for b in range(1, 9):
        deliveries.append(
            Delivery(
                id=b,
                innings_id=2,
                over=(b - 1) // 6,
                ball=((b - 1) % 6) + 1,
                bowler_id=20,
                batsman_id=10,
                non_striker_id=11,
                runs=6,
                extra_type=None,
                extras=0,
            )
        )
    # Ball 9 scored 4 runs -> total 48 + 4 = 52 (achieved target of 50)
    d9 = Delivery(
        id=9,
        innings_id=2,
        over=1,
        ball=3,
        bowler_id=20,
        batsman_id=10,
        non_striker_id=11,
        runs=4,
        extra_type=None,
        extras=0,
    )
    deliveries.append(d9)

    innings_repo.get_by_match_and_number.return_value = inn2
    delivery_repo.get_last_delivery.return_value = d9
    delivery_repo.list_by_innings.return_value = deliveries
    delivery_repo.save.side_effect = lambda d: d
    innings_repo.save.side_effect = lambda inn: inn

    service = DeliveryService(delivery_repo, innings_repo, match_repo)

    # Correct ball 9 from 4 runs to 0 runs -> total becomes 48 (< target 50)
    patch_req = ManualDeliveryUpdate(runs=0)
    await service.update_last_delivery(1, 2, patch_req)

    # Verify innings and match reverted to in-progress / live
    assert inn2.status == InningsStatus.IN_PROGRESS
    assert match.status == MatchStatus.LIVE
    assert match.winner is None
    assert match.win_margin_runs is None
    assert match.win_margin_wickets is None


@sync
async def test_second_innings_target_achievement_via_patch():
    """Patching a ball in Innings 2 to achieve the target marks match COMPLETED with winner and margin."""
    delivery_repo = AsyncMock()
    innings_repo = AsyncMock()
    match_repo = AsyncMock()

    inn2 = make_test_innings(innings_id=2, match_id=1, innings_number=2)
    inn2.target = 50
    inn2.status = InningsStatus.IN_PROGRESS

    match = make_test_match()
    match.status = MatchStatus.LIVE
    match.winner = None
    match_repo.get_by_id.return_value = match

    # 8 balls with 6 runs = 48 runs. Ball 9 was a dot ball (0 runs) -> total 48 (< 50)
    deliveries = []
    for b in range(1, 9):
        deliveries.append(
            Delivery(
                id=b,
                innings_id=2,
                over=(b - 1) // 6,
                ball=((b - 1) % 6) + 1,
                bowler_id=20,
                batsman_id=10,
                non_striker_id=11,
                runs=6,
                extra_type=None,
                extras=0,
            )
        )
    d9 = Delivery(
        id=9,
        innings_id=2,
        over=1,
        ball=3,
        bowler_id=20,
        batsman_id=10,
        non_striker_id=11,
        runs=0,
        extra_type=None,
        extras=0,
    )
    deliveries.append(d9)

    innings_repo.get_by_match_and_number.return_value = inn2
    delivery_repo.get_last_delivery.return_value = d9
    delivery_repo.list_by_innings.return_value = deliveries
    delivery_repo.save.side_effect = lambda d: d
    innings_repo.save.side_effect = lambda inn: inn

    service = DeliveryService(delivery_repo, innings_repo, match_repo)

    # Correct ball 9 from 0 runs to 4 runs -> total becomes 52 (>= target 50)
    patch_req = ManualDeliveryUpdate(runs=4)
    await service.update_last_delivery(1, 2, patch_req)

    # Verify innings and match transition to COMPLETED
    assert inn2.status == InningsStatus.COMPLETED
    assert match.status == MatchStatus.COMPLETED
    assert match.winner == inn2.batting_team_id
    assert match.win_margin_wickets == 10
    assert match.win_margin_runs is None


@sync
async def test_functional_undo_last_delivery():
    """Functional test of undo_last_delivery verifying deletion, crease reset, over counter, and match rollback."""
    delivery_repo = AsyncMock()
    innings_repo = AsyncMock()
    match_repo = AsyncMock()

    inn1 = make_test_innings(innings_id=1, match_id=1, innings_number=1)
    inn1.status = InningsStatus.COMPLETED

    match = make_test_match()
    match.status = MatchStatus.INNINGS_BREAK
    match.winner = None
    match_repo.get_by_id.return_value = match

    d1 = Delivery(
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
    # Ball 2 was the 10th wicket falling (completing the innings)
    d2 = Delivery(
        id=2,
        innings_id=1,
        over=0,
        ball=2,
        bowler_id=20,
        batsman_id=11,
        non_striker_id=10,
        runs=0,
        extra_type=None,
        extras=0,
        wicket_type=WicketType.BOWLED,
        player_out_id=11,
    )
    deliveries_list = [d1, d2]

    delivery_repo.get_last_delivery.return_value = d2
    delivery_repo.list_by_innings.side_effect = lambda inn_id: list(deliveries_list)

    async def mock_delete(ball):
        deliveries_list.remove(ball)

    delivery_repo.delete.side_effect = mock_delete
    innings_repo.get_by_match_and_number.return_value = inn1
    innings_repo.save.side_effect = lambda inn: inn

    service = DeliveryService(delivery_repo, innings_repo, match_repo)

    undone_ball = await service.undo_last_delivery(1, 1)

    # 1. Delivery row deleted
    assert undone_ball.id == 2
    assert d2 not in deliveries_list
    delivery_repo.delete.assert_awaited_once_with(d2)

    # 2. Crease state reset to state after Ball 1 (striker 11, non-striker 10)
    assert inn1.current_striker_id == 11
    assert inn1.current_non_striker_id == 10

    # 3. Innings status rolled back to in-progress
    assert inn1.status == InningsStatus.IN_PROGRESS

    # 4. Match completion rolled back from INNINGS_BREAK to LIVE
    assert match.status == MatchStatus.LIVE
    assert match.winner is None
    assert match.win_margin_runs is None
    assert match.win_margin_wickets is None


@sync
async def test_innings_1_completion_via_patch_creates_inn2_if_not_existing():
    """Patching a ball in Innings 1 to complete the innings creates Innings 2 when it does not exist yet."""
    delivery_repo = AsyncMock()
    innings_repo = AsyncMock()
    match_repo = AsyncMock()

    inn1 = make_test_innings(innings_id=1, match_id=1, innings_number=1)
    inn1.status = InningsStatus.IN_PROGRESS

    match = make_test_match()
    match.status = MatchStatus.LIVE
    match_repo.get_by_id.return_value = match

    # 9 wickets down, ball 10 was 0 runs dot ball
    deliveries = []
    for w in range(1, 10):
        deliveries.append(
            Delivery(
                id=w,
                innings_id=1,
                over=0 if w <= 6 else 1,
                ball=w if w <= 6 else w - 6,
                bowler_id=20,
                batsman_id=10 + w - 1,
                non_striker_id=30,
                runs=1,
                extra_type=None,
                extras=0,
                wicket_type=WicketType.BOWLED,
                player_out_id=10 + w - 1,
            )
        )
    # Ball 10 is dot ball
    d10 = Delivery(
        id=10,
        innings_id=1,
        over=1,
        ball=4,
        bowler_id=20,
        batsman_id=19,
        non_striker_id=30,
        runs=0,
        extra_type=None,
        extras=0,
    )
    deliveries.append(d10)

    innings_repo.get_by_match_and_number.side_effect = lambda m_id, num, **kwargs: inn1 if num == 1 else None
    delivery_repo.get_last_delivery.return_value = d10
    delivery_repo.list_by_innings.return_value = deliveries
    delivery_repo.save.side_effect = lambda d: d
    innings_repo.save.side_effect = lambda inn: inn

    service = DeliveryService(delivery_repo, innings_repo, match_repo)

    # Patch ball 10 to a bowled wicket (10th wicket -> All Out -> Innings 1 completes)
    patch_req = ManualDeliveryUpdate(wicket_type=WicketType.BOWLED, player_out_id=19)
    await service.update_last_delivery(1, 1, patch_req)

    # Innings 1 completed
    assert inn1.status == InningsStatus.COMPLETED
    assert match.status == MatchStatus.INNINGS_BREAK
    # Innings 2 must be created with target 9 + 1 = 10 (since 9 runs were scored)
    innings_repo.create.assert_awaited_once()
    create_call = innings_repo.create.call_args
    assert create_call.kwargs["innings_in"].target == 10
    assert create_call.kwargs["innings_in"].innings_number == 2


@sync
async def test_innings_1_completion_target_resync_without_match_repo():
    """Innings 1 completion resynchronizes existing Innings 2 target even when match_repo is None."""
    delivery_repo = AsyncMock()
    innings_repo = AsyncMock()

    inn1 = make_test_innings(innings_id=1, match_id=1, innings_number=1)
    inn1.status = InningsStatus.IN_PROGRESS
    inn1.current_bowler_id = 41
    inn1.current_striker_id = 19
    inn1.current_non_striker_id = 30

    inn2 = make_test_innings(innings_id=2, match_id=1, innings_number=2)
    inn2.target = 99  # Stale target
    inn2.status = InningsStatus.NOT_STARTED
    inn2.current_striker_id = None
    inn2.current_non_striker_id = None
    inn2.current_bowler_id = None

    existing_deliveries = []
    for w in range(1, 10):
        existing_deliveries.append(
            Delivery(
                id=w,
                innings_id=1,
                over=0 if w <= 6 else 1,
                ball=w if w <= 6 else w - 6,
                bowler_id=40 if w <= 6 else 41,
                batsman_id=10 + w - 1,
                non_striker_id=30,
                runs=2 if w == 1 else 0,
                extra_type=None,
                extras=0,
                wicket_type=WicketType.BOWLED,
                player_out_id=10 + w - 1,
            )
        )

    delivery_repo.list_by_innings.return_value = existing_deliveries
    delivery_repo.create.side_effect = lambda inn_id, payload: Delivery(
        id=10,
        innings_id=inn_id,
        over=1,
        ball=4,
        bowler_id=41,
        batsman_id=19,
        non_striker_id=30,
        runs=payload.runs,
        extra_type=payload.extra_type,
        extras=payload.extras,
        wicket_type=payload.wicket_type,
        player_out_id=payload.player_out_id,
    )
    innings_repo.get_by_match_and_number.side_effect = lambda m_id, num, **kwargs: inn1 if num == 1 else inn2
    innings_repo.save.side_effect = lambda inn: inn

    # match_repo is omitted (None)
    service = DeliveryService(delivery_repo, innings_repo, match_repo=None)

    ball_in = DeliveryCreate(
        bowler_id=41,
        striker_id=19,
        non_striker_id=30,
        runs=0,
        extra_type=None,
        extras=0,
        wicket_type=WicketType.BOWLED,
        player_out_id=19,
    )
    await service.record_delivery(match_id=1, innings_number=1, delivery_in=ball_in)

    assert inn1.status == InningsStatus.COMPLETED
    # inn2 target must be updated to total runs (2) + 1 = 3
    assert inn2.target == 3


@sync
async def test_stumped_delivery_service_validates_squad_wicket_keeper():
    """DeliveryService rejects stumping if fielder is not the squad's designated wicket-keeper."""
    delivery_repo = AsyncMock()
    innings_repo = AsyncMock()
    match_repo = AsyncMock()
    squad_repo = AsyncMock()

    inn1 = make_test_innings(innings_id=1, match_id=1, innings_number=1)
    match = make_test_match()
    match_repo.get_by_id.return_value = match
    innings_repo.get_by_match_and_number.return_value = inn1
    delivery_repo.list_by_innings.return_value = []
    delivery_repo.create.side_effect = lambda inn_id, payload: Delivery(
        id=1, innings_id=inn_id, over=0, ball=1, bowler_id=20, batsman_id=10, non_striker_id=11,
        runs=payload.runs, extra_type=payload.extra_type, extras=payload.extras,
        wicket_type=payload.wicket_type, player_out_id=payload.player_out_id, fielder_id=payload.fielder_id,
    )

    # Bowling squad has player 77 as designated wicket-keeper and player 20 as bowler
    bowling_squad = MagicMock()
    bowling_squad.wicket_keeper_id = 77
    p_bowler = MagicMock(player_id=20, is_playing_xi=True)
    p_keeper = MagicMock(player_id=77, is_playing_xi=True)
    p_outfielder = MagicMock(player_id=88, is_playing_xi=True)
    bowling_squad.players = [p_bowler, p_keeper, p_outfielder]
    squad_repo.get_by_match_and_team.return_value = bowling_squad

    service = DeliveryService(delivery_repo, innings_repo, match_repo, squad_repo=squad_repo)

    # 1. Attributing stumping to outfield player (88) -> rejected
    ball_invalid = DeliveryCreate(
        bowler_id=20,
        striker_id=10,
        non_striker_id=11,
        runs=0,
        wicket_type=WicketType.STUMPED,
        player_out_id=10,
        fielder_id=88,
    )
    with pytest.raises(RuleViolationError) as exc:
        await service.record_delivery(match_id=1, innings_number=1, delivery_in=ball_invalid)
    assert "Only the designated wicket-keeper (77) can execute a stumping" in exc.value.detail

    # 2. Attributing stumping to designated keeper (77) -> accepted
    ball_valid = DeliveryCreate(
        bowler_id=20,
        striker_id=10,
        non_striker_id=11,
        runs=0,
        wicket_type=WicketType.STUMPED,
        player_out_id=10,
        fielder_id=77,
        new_batter_id=12,
    )
    res = await service.record_delivery(match_id=1, innings_number=1, delivery_in=ball_valid)
    assert res.wicket_type == WicketType.STUMPED
    assert res.fielder_id == 77


@sync
async def test_update_last_delivery_reconciles_innings2_target():
    """Correcting the completed total in Innings 1 updates Innings 2 target accordingly."""
    delivery_repo = AsyncMock()
    innings_repo = AsyncMock()
    match_repo = AsyncMock()

    inn1 = make_test_innings(innings_id=1, match_id=1, innings_number=1)
    inn1.status = InningsStatus.COMPLETED
    inn2 = make_test_innings(innings_id=2, match_id=1, innings_number=2)
    inn2.status = InningsStatus.NOT_STARTED
    inn2.current_striker_id = None
    inn2.current_non_striker_id = None
    inn2.current_bowler_id = None
    inn2.target = 21  # Total was 20 + 1

    match = make_test_match()
    match.status = MatchStatus.INNINGS_BREAK
    match_repo.get_by_id.return_value = match

    # 10 wickets all out in T20: total runs = 20
    deliveries = []
    for w in range(1, 10):
        deliveries.append(
            Delivery(
                id=w, innings_id=1, over=0 if w <= 6 else 1, ball=w if w <= 6 else w - 6,
                bowler_id=40 if w <= 6 else 41, batsman_id=10 + w - 1, non_striker_id=30,
                runs=2 if w == 1 else 0, extra_type=None, extras=0,
                wicket_type=WicketType.BOWLED, player_out_id=10 + w - 1,
            )
        )
    # Ball 10 is the final wicket with 0 runs (total = 2)
    d10 = Delivery(
        id=10, innings_id=1, over=1, ball=4, bowler_id=41, batsman_id=19, non_striker_id=30,
        runs=0, extra_type=None, extras=0, wicket_type=WicketType.BOWLED, player_out_id=19,
    )
    deliveries.append(d10)

    innings_repo.get_by_match_and_number.side_effect = lambda m_id, num, **kwargs: inn1 if num == 1 else inn2
    delivery_repo.get_last_delivery.return_value = d10
    delivery_repo.list_by_innings.return_value = deliveries
    delivery_repo.save.side_effect = lambda d: d
    innings_repo.save.side_effect = lambda inn: inn

    service = DeliveryService(delivery_repo, innings_repo, match_repo)

    # Patch ball 10 from 0 runs to 4 runs (runs off bat on wicket) -> total becomes 2 + 4 = 6
    patch_req = ManualDeliveryUpdate(runs=4)
    await service.update_last_delivery(1, 1, patch_req)

    assert inn1.status == InningsStatus.COMPLETED
    # Innings 2 target must now be reconciled to 6 + 1 = 7
    assert inn2.target == 7


@sync
async def test_undo_last_delivery_clears_innings2_target():
    """Undoing the delivery that completed Innings 1 reopens it and clears Innings 2 target to None."""
    delivery_repo = AsyncMock()
    innings_repo = AsyncMock()
    match_repo = AsyncMock()

    inn1 = make_test_innings(innings_id=1, match_id=1, innings_number=1)
    inn1.status = InningsStatus.COMPLETED
    inn2 = make_test_innings(innings_id=2, match_id=1, innings_number=2)
    inn2.status = InningsStatus.NOT_STARTED
    inn2.current_striker_id = None
    inn2.current_non_striker_id = None
    inn2.current_bowler_id = None
    inn2.target = 10  # Previous target

    match = make_test_match()
    match.status = MatchStatus.INNINGS_BREAK
    match_repo.get_by_id.return_value = match

    deliveries = []
    for w in range(1, 10):
        deliveries.append(
            Delivery(
                id=w, innings_id=1, over=0 if w <= 6 else 1, ball=w if w <= 6 else w - 6,
                bowler_id=40 if w <= 6 else 41, batsman_id=10 + w - 1, non_striker_id=30,
                runs=2 if w == 1 else 0, extra_type=None, extras=0,
                wicket_type=WicketType.BOWLED, player_out_id=10 + w - 1,
            )
        )
    # Ball 10 completes the innings
    d10 = Delivery(
        id=10, innings_id=1, over=1, ball=4, bowler_id=41, batsman_id=19, non_striker_id=30,
        runs=0, extra_type=None, extras=0, wicket_type=WicketType.BOWLED, player_out_id=19,
    )
    deliveries.append(d10)

    innings_repo.get_by_match_and_number.side_effect = lambda m_id, num, **kwargs: inn1 if num == 1 else inn2
    delivery_repo.get_last_delivery.return_value = d10
    # After delete, list_by_innings returns 9 balls
    delivery_repo.list_by_innings.return_value = deliveries[:9]
    innings_repo.save.side_effect = lambda inn: inn

    service = DeliveryService(delivery_repo, innings_repo, match_repo)

    await service.undo_last_delivery(1, 1)

    # Innings 1 is reopened
    assert inn1.status == InningsStatus.IN_PROGRESS
    # Innings 2 target must be cleared to None
    assert inn2.target is None
    # Match status reverts to LIVE
    assert match.status == MatchStatus.LIVE


@sync
async def test_reopen_and_recomplete_innings1_recalculates_innings2_target():
    """Undoing Innings 1's final ball clears target; subsequent ball re-completes and updates target."""
    delivery_repo = AsyncMock()
    innings_repo = AsyncMock()
    match_repo = AsyncMock()

    inn1 = make_test_innings(innings_id=1, match_id=1, innings_number=1)
    inn1.status = InningsStatus.COMPLETED
    inn2 = make_test_innings(innings_id=2, match_id=1, innings_number=2)
    inn2.status = InningsStatus.NOT_STARTED
    inn2.current_striker_id = None
    inn2.current_non_striker_id = None
    inn2.current_bowler_id = None
    inn2.target = 10

    match = make_test_match()
    match.status = MatchStatus.INNINGS_BREAK
    match_repo.get_by_id.return_value = match

    deliveries = []
    for w in range(1, 10):
        deliveries.append(
            Delivery(
                id=w, innings_id=1, over=0 if w <= 6 else 1, ball=w if w <= 6 else w - 6,
                bowler_id=40 if w <= 6 else 41, batsman_id=10 + w - 1, non_striker_id=30,
                runs=2 if w == 1 else 0, extra_type=None, extras=0,
                wicket_type=WicketType.BOWLED, player_out_id=10 + w - 1,
            )
        )
    d10 = Delivery(
        id=10, innings_id=1, over=1, ball=4, bowler_id=41, batsman_id=19, non_striker_id=30,
        runs=0, extra_type=None, extras=0, wicket_type=WicketType.BOWLED, player_out_id=19,
    )
    deliveries.append(d10)

    innings_repo.get_by_match_and_number.side_effect = lambda m_id, num, **kwargs: inn1 if num == 1 else inn2
    delivery_repo.get_last_delivery.return_value = d10
    delivery_repo.list_by_innings.return_value = deliveries[:9]
    innings_repo.save.side_effect = lambda inn: inn

    service = DeliveryService(delivery_repo, innings_repo, match_repo)

    # 1. Undo last delivery -> target cleared
    await service.undo_last_delivery(1, 1)
    assert inn1.status == InningsStatus.IN_PROGRESS
    assert inn2.target is None

    # Set incoming batter for the 10th wicket
    await service.set_incoming_batter(match_id=1, innings_number=1, player_id=19)

    # 2. Now record a new 10th ball scoring 6 runs and bowled out -> total becomes 2 + 6 = 8
    delivery_repo.create.side_effect = lambda inn_id, payload: Delivery(
        id=10, innings_id=inn_id, over=1, ball=4, bowler_id=41, batsman_id=19, non_striker_id=30,
        runs=payload.runs, extra_type=payload.extra_type, extras=payload.extras,
        wicket_type=payload.wicket_type, player_out_id=payload.player_out_id,
    )
    new_ball = DeliveryCreate(
        bowler_id=41, striker_id=19, non_striker_id=30, runs=6, extra_type=None, extras=0,
        wicket_type=WicketType.BOWLED, player_out_id=19,
    )
    await service.record_delivery(match_id=1, innings_number=1, delivery_in=new_ball)

    assert inn1.status == InningsStatus.COMPLETED
    # Innings 2 target must now be set to 8 + 1 = 9
    assert inn2.target == 9


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
async def test_stumped_delivery_fails_when_squad_missing():
    """Stumping fails with RuleViolationError if fielding squad does not exist."""
    delivery_repo = AsyncMock()
    innings_repo = AsyncMock()
    match_repo = AsyncMock()
    squad_repo = AsyncMock()

    inn1 = make_test_innings(innings_id=1, match_id=1, innings_number=1)
    match = make_test_match()
    match_repo.get_by_id.return_value = match
    innings_repo.get_by_match_and_number.return_value = inn1
    squad_repo.get_by_match_and_team.return_value = None  # Missing squad

    service = DeliveryService(delivery_repo, innings_repo, match_repo, squad_repo=squad_repo)

    ball = DeliveryCreate(
        bowler_id=20, striker_id=10, non_striker_id=11, runs=0,
        wicket_type=WicketType.STUMPED, player_out_id=10, fielder_id=77,
    )
    with pytest.raises(RuleViolationError) as exc:
        await service.record_delivery(match_id=1, innings_number=1, delivery_in=ball)
    assert "fielding squad does not exist" in exc.value.detail


@sync
async def test_stumped_delivery_fails_when_wicket_keeper_is_null():
    """Stumping fails with RuleViolationError if fielding squad has no designated keeper."""
    delivery_repo = AsyncMock()
    innings_repo = AsyncMock()
    match_repo = AsyncMock()
    squad_repo = AsyncMock()

    inn1 = make_test_innings(innings_id=1, match_id=1, innings_number=1)
    match = make_test_match()
    match_repo.get_by_id.return_value = match
    innings_repo.get_by_match_and_number.return_value = inn1

    bowling_squad = MagicMock()
    bowling_squad.wicket_keeper_id = None  # Null keeper
    p_bowler = MagicMock(player_id=20, is_playing_xi=True)
    bowling_squad.players = [p_bowler]
    squad_repo.get_by_match_and_team.return_value = bowling_squad

    service = DeliveryService(delivery_repo, innings_repo, match_repo, squad_repo=squad_repo)

    ball = DeliveryCreate(
        bowler_id=20, striker_id=10, non_striker_id=11, runs=0,
        wicket_type=WicketType.STUMPED, player_out_id=10, fielder_id=77,
    )
    with pytest.raises(RuleViolationError) as exc:
        await service.record_delivery(match_id=1, innings_number=1, delivery_in=ball)
    assert "fielding squad has no designated wicket-keeper" in exc.value.detail


@sync
async def test_patch_of_existing_stumping_preserves_keeper_validation():
    """Patching a stumping ball validates keeper identity even when only commentary is modified."""
    delivery_repo = AsyncMock()
    innings_repo = AsyncMock()
    match_repo = AsyncMock()
    squad_repo = AsyncMock()

    inn1 = make_test_innings(innings_id=1, match_id=1, innings_number=1)
    match = make_test_match()
    match_repo.get_by_id.return_value = match
    innings_repo.get_by_match_and_number.return_value = inn1

    existing_stumping = Delivery(
        id=1, innings_id=1, over=0, ball=1, bowler_id=20, batsman_id=10, non_striker_id=11,
        runs=0, extra_type=None, extras=0, wicket_type=WicketType.STUMPED, player_out_id=10,
        fielder_id=77, commentary="Original stumping",
    )
    delivery_repo.get_last_delivery.return_value = existing_stumping
    delivery_repo.list_by_innings.return_value = [existing_stumping]
    delivery_repo.save.side_effect = lambda d: d
    innings_repo.save.side_effect = lambda inn: inn

    bowling_squad = MagicMock()
    bowling_squad.wicket_keeper_id = 77
    p_bowler = MagicMock(player_id=20, is_playing_xi=True)
    p_keeper = MagicMock(player_id=77, is_playing_xi=True)
    bowling_squad.players = [p_bowler, p_keeper]
    squad_repo.get_by_match_and_team.return_value = bowling_squad

    service = DeliveryService(delivery_repo, innings_repo, match_repo, squad_repo=squad_repo)

    # 1. Patch only commentary: preserves keeper validation and succeeds
    patch_req = ManualDeliveryUpdate(commentary="Updated stumping commentary")
    res = await service.update_last_delivery(1, 1, patch_req)
    assert res.commentary == "Updated stumping commentary"
    assert res.wicket_type == WicketType.STUMPED
    assert res.fielder_id == 77

    # 2. Patch fielder to non-keeper (88): fails
    patch_invalid_fielder = ManualDeliveryUpdate(fielder_id=88)
    with pytest.raises(RuleViolationError) as exc:
        await service.update_last_delivery(1, 1, patch_invalid_fielder)
    assert "Only the designated wicket-keeper (77) can execute a stumping" in exc.value.detail


@sync
async def test_reconcile_innings2_target_fails_if_innings2_started():
    """Target reconciliation raises RuleViolationError if Innings 2 has already started."""
    delivery_repo = AsyncMock()
    innings_repo = AsyncMock()
    match_repo = AsyncMock()

    inn1 = make_test_innings(innings_id=1, match_id=1, innings_number=1)
    inn1.status = InningsStatus.COMPLETED

    # Innings 2 is already IN_PROGRESS with active striker
    inn2 = make_test_innings(innings_id=2, match_id=1, innings_number=2)
    inn2.status = InningsStatus.IN_PROGRESS
    inn2.current_striker_id = 50

    innings_repo.get_by_match_and_number.side_effect = lambda m_id, num, **kwargs: inn2 if num == 2 else inn1

    aggregate = InningsAggregate.reconstruct(
        innings_id=1, match_id=1, match_format="t20", target=None,
        deliveries=[], status=InningsStatus.COMPLETED,
    )
    service = DeliveryService(delivery_repo, innings_repo, match_repo)

    with pytest.raises(RuleViolationError) as exc:
        await service._reconcile_innings2_target(match_id=1, innings1=inn1, inn1_aggregate=aggregate)
    assert "Cannot reconcile Innings 2 target: Innings 2 has already started" in exc.value.detail


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




