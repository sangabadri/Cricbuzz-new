import pytest
from app.domain.crease import CreaseState
from app.domain.exceptions import CreaseViolationError, OverProgressionError, RuleViolationError
from app.domain.innings_aggregate import InningsAggregate
from app.domain.rules.formats import T20FormatRules
from app.domain.enums import ExtraType, WicketType


@pytest.fixture
def t20_aggregate():
    crease = CreaseState(striker_id=1, non_striker_id=2)
    return InningsAggregate(
        innings_id=1,
        match_id=1,
        format_rules=T20FormatRules(),
        target=None,
        crease=crease,
    )


def test_record_legal_ball_and_strike_rotation(t20_aggregate):
    # Ball 1: 1 run off bat -> striker (1) rotates to non-striker, non-striker (2) is now on strike
    d1 = t20_aggregate.record_ball(bowler_id=10, runs=1)
    assert d1["over"] == 0
    assert d1["ball"] == 1
    assert d1["delivery_index"] == 1
    assert t20_aggregate.total_runs == 1
    assert t20_aggregate.total_legal_balls == 1
    assert t20_aggregate.current_ball_in_over == 1
    assert t20_aggregate.crease.striker_id == 2
    assert t20_aggregate.crease.non_striker_id == 1

    # Ball 2: 4 runs (boundary) -> strike retained by player 2
    d2 = t20_aggregate.record_ball(bowler_id=10, runs=4)
    assert d2["ball"] == 2
    assert t20_aggregate.total_runs == 5
    assert t20_aggregate.crease.striker_id == 2


def test_extras_do_not_increment_legal_balls(t20_aggregate):
    # Ball 1: Wide + 1 run extra
    d1 = t20_aggregate.record_ball(bowler_id=10, runs=0, extra_type=ExtraType.WIDE, extras=1)
    assert t20_aggregate.total_runs == 1
    assert t20_aggregate.total_legal_balls == 0
    assert t20_aggregate.current_ball_in_over == 0
    # Strike should not rotate on wide
    assert t20_aggregate.crease.striker_id == 1

    # Ball 2: No-ball + 1 run extra + 2 off bat
    d2 = t20_aggregate.record_ball(bowler_id=10, runs=2, extra_type=ExtraType.NOBALL, extras=1)
    assert t20_aggregate.total_runs == 4
    assert t20_aggregate.total_legal_balls == 0
    assert t20_aggregate.current_ball_in_over == 0


def test_over_completion_and_end_of_over_strike_rotation(t20_aggregate):
    # Bowl an entire 6-ball over with 0 runs
    for i in range(1, 7):
        t20_aggregate.record_ball(bowler_id=10, runs=0)

    # After 6 legal balls:
    # Over 0 is complete, current_over is 1, current_ball_in_over is 0
    assert t20_aggregate.completed_overs == 1
    assert t20_aggregate.current_over == 1
    assert t20_aggregate.current_ball_in_over == 0
    assert t20_aggregate.total_legal_balls == 6
    # Bowler 10 completed 1 over
    assert t20_aggregate.bowler_overs[10] == 1
    # Batters swap ends at the end of the over (player 2 is now on strike!)
    assert t20_aggregate.crease.striker_id == 2
    assert t20_aggregate.crease.non_striker_id == 1


def test_consecutive_overs_prohibited(t20_aggregate):
    # Complete over 0 with bowler 10
    for _ in range(6):
        t20_aggregate.record_ball(bowler_id=10, runs=0)

    # Attempt to bowl first ball of over 1 with the same bowler 10
    with pytest.raises(OverProgressionError) as exc:
        t20_aggregate.record_ball(bowler_id=10, runs=0)
    assert "cannot bowl consecutive overs" in exc.value.detail

    # A different bowler (bowler 11) is allowed
    t20_aggregate.record_ball(bowler_id=11, runs=0)
    assert t20_aggregate.current_bowler_id == 11


def test_bowler_quota_exceeded(t20_aggregate):
    # In T20 max_bowler_overs is 4.
    # Manually assign 4 completed overs to bowler 10
    t20_aggregate.bowler_overs[10] = 4
    t20_aggregate.last_completed_over_bowler_id = 99  # to avoid consecutive check

    with pytest.raises(OverProgressionError) as exc:
        t20_aggregate.record_ball(bowler_id=10, runs=0)
    assert "reached maximum quota of 4 overs" in exc.value.detail


def test_all_out_innings_completion(t20_aggregate):
    # Fall of 10 wickets:
    # Over 0: bowler 10 bowls first 6 wickets
    # Over 1: bowler 11 bowls remaining wickets
    for w in range(1, 10):
        t20_aggregate.record_ball(
            bowler_id=10 if w <= 6 else 11,
            runs=0,
            wicket_type=WicketType.BOWLED,
            player_out_id=t20_aggregate.crease.striker_id,
            new_batter_id=100 + w,
        )
    assert t20_aggregate.is_completed is False
    assert t20_aggregate.total_wickets == 9

    # 10th wicket falls (no incoming batter)
    t20_aggregate.record_ball(
        bowler_id=11,
        runs=0,
        wicket_type=WicketType.BOWLED,
        player_out_id=t20_aggregate.crease.striker_id,
        new_batter_id=None,
    )
    assert t20_aggregate.is_completed is True
    assert "All out" in t20_aggregate.completion_reason

    # Attempting to bowl after all out raises error
    with pytest.raises(OverProgressionError):
        t20_aggregate.record_ball(bowler_id=10, runs=0)


def test_target_reached_innings_completion():
    crease = CreaseState(striker_id=1, non_striker_id=2)
    agg = InningsAggregate(
        innings_id=2,
        match_id=1,
        format_rules=T20FormatRules(),
        target=10,  # Needs 10 to win
        crease=crease,
    )

    agg.record_ball(bowler_id=10, runs=6)
    assert agg.is_completed is False

    agg.record_ball(bowler_id=10, runs=4)  # Total 10 runs reached
    assert agg.is_completed is True
    assert "Target of 10 runs reached" in agg.completion_reason


def test_bowler_change_prohibited_mid_over_after_wide(t20_aggregate):
    # Ball 1: Bowler 10 bowls a wide (0 legal balls completed)
    t20_aggregate.record_ball(bowler_id=10, runs=0, extra_type=ExtraType.WIDE, extras=1)
    assert t20_aggregate.current_bowler_id == 10
    assert t20_aggregate.current_ball_in_over == 0

    # Next ball: Bowler 11 cannot take over mid-over
    with pytest.raises(OverProgressionError) as exc:
        t20_aggregate.record_ball(bowler_id=11, runs=0)
    assert "is in progress by bowler 10" in exc.value.detail

    # Bowler 10 can continue
    t20_aggregate.record_ball(bowler_id=10, runs=1)
    assert t20_aggregate.current_ball_in_over == 1

