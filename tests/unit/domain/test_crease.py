import pytest
from app.domain.crease import CreaseState
from app.domain.exceptions import CreaseViolationError
from app.domain.enums import WicketType


def test_crease_initialization():
    crease = CreaseState()
    crease.initialize(striker_id=1, non_striker_id=2)
    assert crease.striker_id == 1
    assert crease.non_striker_id == 2
    assert crease.dismissed_player_ids == []


def test_crease_same_player_rejected():
    crease = CreaseState()
    with pytest.raises(CreaseViolationError) as exc:
        crease.initialize(striker_id=1, non_striker_id=1)
    assert "cannot be the same player" in exc.value.detail


def test_strike_rotation_on_runs():
    crease = CreaseState(striker_id=10, non_striker_id=20)

    # 0 runs: strike retained
    crease.handle_runs(0)
    assert crease.striker_id == 10
    assert crease.non_striker_id == 20

    # 1 run: strike rotated
    crease.handle_runs(1)
    assert crease.striker_id == 20
    assert crease.non_striker_id == 10

    # 2 runs: strike retained
    crease.handle_runs(2)
    assert crease.striker_id == 20
    assert crease.non_striker_id == 10

    # 3 runs: strike rotated
    crease.handle_runs(3)
    assert crease.striker_id == 10
    assert crease.non_striker_id == 20

    # 4 runs (boundary): strike retained
    crease.handle_runs(4)
    assert crease.striker_id == 10
    assert crease.non_striker_id == 20

    # 6 runs (six): strike retained
    crease.handle_runs(6)
    assert crease.striker_id == 10
    assert crease.non_striker_id == 20


def test_rotate_strike_at_over_end():
    crease = CreaseState(striker_id=10, non_striker_id=20)
    crease.rotate_strike_at_over_end()
    assert crease.striker_id == 20
    assert crease.non_striker_id == 10


def test_striker_dismissal_and_incoming_batter():
    crease = CreaseState(striker_id=10, non_striker_id=20)
    crease.handle_dismissal(out_player_id=10, new_batter_id=30, wicket_type=WicketType.BOWLED)

    assert 10 in crease.dismissed_player_ids
    assert crease.striker_id == 30
    assert crease.non_striker_id == 20


def test_non_striker_can_only_be_run_out():
    crease = CreaseState(striker_id=10, non_striker_id=20)

    # Trying to dismiss non-striker as bowled must fail
    with pytest.raises(CreaseViolationError) as exc:
        crease.handle_dismissal(out_player_id=20, new_batter_id=30, wicket_type=WicketType.BOWLED)
    assert "Non-striker cannot be dismissed by bowled" in exc.value.detail

    # Trying to dismiss non-striker as caught must fail
    with pytest.raises(CreaseViolationError) as exc:
        crease.handle_dismissal(out_player_id=20, new_batter_id=30, wicket_type=WicketType.CAUGHT)
    assert "Only run-out is valid for the non-striker" in exc.value.detail

    # Run out is valid for non-striker
    crease.handle_dismissal(out_player_id=20, new_batter_id=30, wicket_type=WicketType.RUN_OUT)
    assert 20 in crease.dismissed_player_ids
    assert crease.striker_id == 10
    assert crease.non_striker_id == 30


def test_non_rebatting_rule():
    crease = CreaseState(striker_id=10, non_striker_id=20)
    # First batter dismissed
    crease.handle_dismissal(out_player_id=10, new_batter_id=30, wicket_type=WicketType.LBW)

    # Attempt to bring back player 10 when 20 gets dismissed
    with pytest.raises(CreaseViolationError) as exc:
        crease.handle_dismissal(out_player_id=20, new_batter_id=10, wicket_type=WicketType.RUN_OUT)
    assert "already been dismissed and cannot bat again" in exc.value.detail


def test_dismissed_player_not_on_crease():
    crease = CreaseState(striker_id=10, non_striker_id=20)
    with pytest.raises(CreaseViolationError) as exc:
        crease.handle_dismissal(out_player_id=99, new_batter_id=30, wicket_type=WicketType.BOWLED)
    assert "is not currently at the crease" in exc.value.detail
