import pytest
from pydantic import ValidationError
from app.domain.crease import CreaseState
from app.domain.enums import ExtraType, WicketType
from app.domain.exceptions import CricketDomainError, CreaseViolationError, RuleViolationError
from app.domain.innings_aggregate import InningsAggregate
from app.schemas.delivery import DeliveryCreate


def test_valid_delivery_payload():
    d = DeliveryCreate(
        bowler_id=1,
        striker_id=2,
        non_striker_id=3,
        runs=1,
        extra_type=None,
        extras=0,
        wicket_type=None,
        player_out_id=None,
        fielder_id=None,
    )
    assert d.runs == 1


def test_invalid_runs_rejected_by_schema():
    with pytest.raises(ValidationError):
        DeliveryCreate(
            bowler_id=1,
            striker_id=2,
            non_striker_id=3,
            runs=7,  # Invalid runs (>6)
        )


def test_same_striker_and_non_striker():
    crease = CreaseState()
    with pytest.raises(CreaseViolationError) as exc:
        crease.initialize(striker_id=2, non_striker_id=2)
    assert "cannot be the same player" in exc.value.detail


def test_same_batsman_and_bowler():
    aggregate = InningsAggregate.reconstruct(
        innings_id=1, match_id=1, match_format="t20", target=None, deliveries=[], current_striker_id=2, current_non_striker_id=3
    )
    with pytest.raises(RuleViolationError) as exc:
        aggregate.validate_bowler(2)
    assert "is currently batting and cannot bowl" in exc.value.detail


def test_wide_without_extras():
    with pytest.raises(RuleViolationError) as exc:
        InningsAggregate.validate_extras_rules(ExtraType.WIDE, 0)
    assert "Extras must be at least 1" in exc.value.detail


def test_extras_without_extra_type():
    with pytest.raises(RuleViolationError) as exc:
        InningsAggregate.validate_extras_rules(None, 2)
    assert "Extras must be 0 when extra_type is None" in exc.value.detail


def test_caught_requires_fielder():
    aggregate = InningsAggregate.reconstruct(
        innings_id=1, match_id=1, match_format="t20", target=None, deliveries=[], current_striker_id=2, current_non_striker_id=3
    )
    with pytest.raises(RuleViolationError) as exc:
        aggregate.validate_dismissal_rules(WicketType.CAUGHT, player_out_id=2, bowler_id=1, fielder_id=None)
    assert "fielder_id is required" in exc.value.detail


def test_caught_fielder_can_be_bowler():
    aggregate = InningsAggregate.reconstruct(
        innings_id=1, match_id=1, match_format="t20", target=None, deliveries=[], current_striker_id=2, current_non_striker_id=3
    )
    # Should not raise any error
    aggregate.validate_dismissal_rules(WicketType.CAUGHT, player_out_id=2, bowler_id=1, fielder_id=1)


def test_bowled_cannot_have_fielder():
    aggregate = InningsAggregate.reconstruct(
        innings_id=1, match_id=1, match_format="t20", target=None, deliveries=[], current_striker_id=2, current_non_striker_id=3
    )
    with pytest.raises(RuleViolationError) as exc:
        aggregate.validate_dismissal_rules(WicketType.BOWLED, player_out_id=2, bowler_id=1, fielder_id=4)
    assert "fielder_id must be None" in exc.value.detail


def test_lbw_cannot_have_fielder():
    aggregate = InningsAggregate.reconstruct(
        innings_id=1, match_id=1, match_format="t20", target=None, deliveries=[], current_striker_id=2, current_non_striker_id=3
    )
    with pytest.raises(RuleViolationError) as exc:
        aggregate.validate_dismissal_rules(WicketType.LBW, player_out_id=2, bowler_id=1, fielder_id=4)
    assert "fielder_id must be None" in exc.value.detail


def test_hit_wicket_cannot_have_fielder():
    aggregate = InningsAggregate.reconstruct(
        innings_id=1, match_id=1, match_format="t20", target=None, deliveries=[], current_striker_id=2, current_non_striker_id=3
    )
    with pytest.raises(RuleViolationError) as exc:
        aggregate.validate_dismissal_rules(WicketType.HIT_WICKET, player_out_id=2, bowler_id=1, fielder_id=4)
    assert "fielder_id must be None" in exc.value.detail


def test_fielder_must_be_none_when_no_wicket():
    aggregate = InningsAggregate.reconstruct(
        innings_id=1, match_id=1, match_format="t20", target=None, deliveries=[], current_striker_id=2, current_non_striker_id=3
    )
    with pytest.raises(RuleViolationError) as exc:
        aggregate.validate_dismissal_rules(None, player_out_id=None, bowler_id=1, fielder_id=4)
    assert "fielder_id must be None when no wicket occurs" in exc.value.detail


def test_run_out_requires_player_out_id():
    aggregate = InningsAggregate.reconstruct(
        innings_id=1, match_id=1, match_format="t20", target=None, deliveries=[], current_striker_id=2, current_non_striker_id=3
    )
    with pytest.raises(RuleViolationError) as exc:
        aggregate.validate_dismissal_rules(WicketType.RUN_OUT, player_out_id=None, bowler_id=1, fielder_id=None)
    assert "player_out_id is required" in exc.value.detail
