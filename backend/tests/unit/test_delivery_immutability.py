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

