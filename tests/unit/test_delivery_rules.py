import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from app.domain.exceptions import CricketDomainError
from app.schemas.delivery import DeliveryCreate
from app.schemas.enums import ExtraType, WicketType
from app.services.delivery import validate_delivery_payload


def test_valid_delivery_payload():
    d = DeliveryCreate(
        over=0,
        ball=1,
        bowler_id=1,
        batsman_id=2,
        non_striker_id=3,
        runs=1,
        extra_type=None,
        extras=0,
        wicket_type=None,
        player_out_id=None,
        fielder_id=None,
    )
    # Should not raise
    validate_delivery_payload(d)


def test_invalid_runs_rejected_by_schema():
    with pytest.raises(ValidationError):
        DeliveryCreate(
            over=0,
            ball=1,
            bowler_id=1,
            batsman_id=2,
            non_striker_id=3,
            runs=7,  # Invalid runs (>6)
        )


def test_same_striker_and_non_striker():
    d = DeliveryCreate(
        over=0,
        ball=1,
        bowler_id=1,
        batsman_id=2,
        non_striker_id=2,
        runs=0,
    )
    with pytest.raises(CricketDomainError) as exc:
        validate_delivery_payload(d)
    assert "Striker and non-striker cannot be the same" in exc.value.detail


def test_same_batsman_and_bowler():
    d = DeliveryCreate(
        over=0,
        ball=1,
        bowler_id=2,
        batsman_id=2,
        non_striker_id=3,
        runs=0,
    )
    with pytest.raises(CricketDomainError) as exc:
        validate_delivery_payload(d)
    assert "Batsman and bowler cannot be the same" in exc.value.detail


def test_wide_without_extras():
    d = DeliveryCreate(
        over=0,
        ball=1,
        bowler_id=1,
        batsman_id=2,
        non_striker_id=3,
        runs=0,
        extra_type=ExtraType.WIDE,
        extras=0,
    )
    with pytest.raises(CricketDomainError) as exc:
        validate_delivery_payload(d)
    assert "Extras must be at least 1" in exc.value.detail


def test_extras_without_extra_type():
    d = DeliveryCreate(
        over=0,
        ball=1,
        bowler_id=1,
        batsman_id=2,
        non_striker_id=3,
        runs=0,
        extra_type=None,
        extras=2,
    )
    with pytest.raises(CricketDomainError) as exc:
        validate_delivery_payload(d)
    assert "Extras must be 0 when extra_type is None" in exc.value.detail


def test_caught_requires_fielder():
    d = DeliveryCreate(
        over=0,
        ball=1,
        bowler_id=1,
        batsman_id=2,
        non_striker_id=3,
        runs=0,
        wicket_type=WicketType.CAUGHT,
        player_out_id=2,
        fielder_id=None,
    )
    with pytest.raises(CricketDomainError) as exc:
        validate_delivery_payload(d)
    assert "fielder_id is required" in exc.value.detail


def test_caught_fielder_can_be_bowler():
    d = DeliveryCreate(
        over=0,
        ball=1,
        bowler_id=1,
        batsman_id=2,
        non_striker_id=3,
        runs=0,
        wicket_type=WicketType.CAUGHT,
        player_out_id=2,
        fielder_id=1,  # return catch by bowler
    )
    # Should not raise any error
    validate_delivery_payload(d)


def test_bowled_cannot_have_fielder():
    d = DeliveryCreate(
        over=0,
        ball=1,
        bowler_id=1,
        batsman_id=2,
        non_striker_id=3,
        runs=0,
        wicket_type=WicketType.BOWLED,
        player_out_id=2,
        fielder_id=4,
    )
    with pytest.raises(CricketDomainError) as exc:
        validate_delivery_payload(d)
    assert "fielder_id must be None" in exc.value.detail
