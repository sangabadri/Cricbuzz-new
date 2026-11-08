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


def test_hit_wicket_off_noball_rejected():
    with pytest.raises(RuleViolationError) as exc:
        InningsAggregate.validate_delivery_state(
            runs=0,
            extra_type=ExtraType.NOBALL,
            extras=1,
            wicket_type=WicketType.HIT_WICKET,
            player_out_id=2,
            fielder_id=None,
        )
    assert "cannot be dismissed hit_wicket off a no-ball" in exc.value.detail


def test_hit_wicket_off_wide_allowed():
    # Hit wicket off a wide is legal under MCC Law 22.17
    InningsAggregate.validate_delivery_state(
        runs=0,
        extra_type=ExtraType.WIDE,
        extras=1,
        wicket_type=WicketType.HIT_WICKET,
        player_out_id=2,
        fielder_id=None,
    )


def test_stumped_requires_fielder():
    with pytest.raises(RuleViolationError) as exc:
        InningsAggregate.validate_delivery_state(
            runs=0,
            extra_type=None,
            extras=0,
            wicket_type=WicketType.STUMPED,
            player_out_id=2,
            fielder_id=None,
        )
    assert "fielder_id is required for stumped dismissals" in exc.value.detail

    # Allowed with a valid fielder
    InningsAggregate.validate_delivery_state(
        runs=0,
        extra_type=None,
        extras=0,
        wicket_type=WicketType.STUMPED,
        player_out_id=2,
        fielder_id=5,
    )


def test_dismissals_other_than_run_out_on_byes_and_legbyes_rejected():
    disallowed_wickets = (
        WicketType.BOWLED,
        WicketType.LBW,
        WicketType.CAUGHT,
        WicketType.STUMPED,
        WicketType.HIT_WICKET,
    )
    for extra_type in (ExtraType.BYE, ExtraType.LEGBYE):
        for w_type in disallowed_wickets:
            fielder = 5 if w_type in (WicketType.CAUGHT, WicketType.STUMPED) else None
            with pytest.raises(RuleViolationError) as exc:
                InningsAggregate.validate_delivery_state(
                    runs=0,
                    extra_type=extra_type,
                    extras=1,
                    wicket_type=w_type,
                    player_out_id=2,
                    fielder_id=fielder,
                )
            assert f"cannot be dismissed {w_type.value} on {extra_type.value}" in exc.value.detail

        # RUN_OUT is permitted on byes and leg-byes
        InningsAggregate.validate_delivery_state(
            runs=0,
            extra_type=extra_type,
            extras=1,
            wicket_type=WicketType.RUN_OUT,
            player_out_id=2,
            fielder_id=5,
        )


def test_self_fielder_or_crease_partner_rejected_on_catch_and_stumping():
    # 1. Catch self-fielder (dismissed batter)
    with pytest.raises(RuleViolationError) as exc:
        InningsAggregate.validate_delivery_state(
            runs=0,
            extra_type=None,
            extras=0,
            wicket_type=WicketType.CAUGHT,
            player_out_id=2,
            fielder_id=2,
            striker_id=2,
            non_striker_id=3,
            bowler_id=1,
        )
    assert "Fielder cannot be the dismissed batter" in exc.value.detail

    # 2. Catch active partner fielder
    with pytest.raises(RuleViolationError) as exc:
        InningsAggregate.validate_delivery_state(
            runs=0,
            extra_type=None,
            extras=0,
            wicket_type=WicketType.CAUGHT,
            player_out_id=2,
            fielder_id=3,
            striker_id=2,
            non_striker_id=3,
            bowler_id=1,
        )
    assert "Fielder cannot be an active batter" in exc.value.detail

    # 3. Stumped partner fielder
    with pytest.raises(RuleViolationError) as exc:
        InningsAggregate.validate_delivery_state(
            runs=0,
            extra_type=None,
            extras=0,
            wicket_type=WicketType.STUMPED,
            player_out_id=2,
            fielder_id=3,
            striker_id=2,
            non_striker_id=3,
            bowler_id=1,
        )
    assert "Fielder cannot be an active batter" in exc.value.detail

    # 4. Stumped by bowler
    with pytest.raises(RuleViolationError) as exc:
        InningsAggregate.validate_delivery_state(
            runs=0,
            extra_type=None,
            extras=0,
            wicket_type=WicketType.STUMPED,
            player_out_id=2,
            fielder_id=1,
            striker_id=2,
            non_striker_id=3,
            bowler_id=1,
        )
    assert "Bowler cannot execute a stumping" in exc.value.detail

    # 5. Bowler cannot be the dismissed player
    with pytest.raises(RuleViolationError) as exc:
        InningsAggregate.validate_delivery_state(
            runs=0,
            extra_type=None,
            extras=0,
            wicket_type=WicketType.BOWLED,
            player_out_id=1,
            fielder_id=None,
            striker_id=None,
            non_striker_id=None,
            bowler_id=1,
        )
    assert "Bowler cannot be the dismissed player" in exc.value.detail

    # 6. Caught and bowled is allowed (fielder == bowler)
    InningsAggregate.validate_delivery_state(
        runs=0,
        extra_type=None,
        extras=0,
        wicket_type=WicketType.CAUGHT,
        player_out_id=2,
        fielder_id=1,
        striker_id=2,
        non_striker_id=3,
        bowler_id=1,
    )

    # 7. Run out self-fielder or crease partner fielder rejected
    with pytest.raises(RuleViolationError) as exc:
        InningsAggregate.validate_delivery_state(
            runs=0,
            extra_type=None,
            extras=0,
            wicket_type=WicketType.RUN_OUT,
            player_out_id=2,
            fielder_id=2,
            striker_id=2,
            non_striker_id=3,
            bowler_id=1,
        )
    assert "Fielder cannot be the dismissed batter" in exc.value.detail

    with pytest.raises(RuleViolationError) as exc:
        InningsAggregate.validate_delivery_state(
            runs=0,
            extra_type=None,
            extras=0,
            wicket_type=WicketType.RUN_OUT,
            player_out_id=2,
            fielder_id=3,
            striker_id=2,
            non_striker_id=3,
            bowler_id=1,
        )
    assert "Fielder cannot be an active batter" in exc.value.detail

    # 8. Bowler cannot be an active batter
    with pytest.raises(RuleViolationError) as exc:
        InningsAggregate.validate_delivery_state(
            runs=0,
            extra_type=None,
            extras=0,
            wicket_type=None,
            player_out_id=None,
            fielder_id=None,
            striker_id=1,
            non_striker_id=3,
            bowler_id=1,
        )
    assert "Bowler (1) cannot be an active batter" in exc.value.detail

    with pytest.raises(RuleViolationError) as exc:
        InningsAggregate.validate_delivery_state(
            runs=0,
            extra_type=None,
            extras=0,
            wicket_type=None,
            player_out_id=None,
            fielder_id=None,
            striker_id=2,
            non_striker_id=1,
            bowler_id=1,
        )
    assert "Bowler (1) cannot be an active batter" in exc.value.detail


def test_hit_wicket_off_wide_record_ball_execution():
    """Verify end-to-end execution of hit-wicket off a wide via InningsAggregate.record_ball."""
    agg = InningsAggregate.reconstruct(
        innings_id=1,
        match_id=1,
        match_format="t20",
        target=None,
        deliveries=[],
        current_striker_id=10,
        current_non_striker_id=11,
        current_bowler_id=20,
    )

    res = agg.record_ball(
        bowler_id=20,
        runs=0,
        extra_type=ExtraType.WIDE,
        extras=1,
        wicket_type=WicketType.HIT_WICKET,
        player_out_id=10,
        fielder_id=None,
        new_batter_id=12,
    )

    assert agg.total_runs == 1
    assert agg.total_wickets == 1
    assert agg.total_legal_balls == 0  # Wide does not count as a legal ball
    assert agg.crease.striker_id == 12  # New batter is at the crease
    assert agg.crease.non_striker_id == 11
    assert res["wicket_type"] == WicketType.HIT_WICKET
    assert res["is_legal_ball"] is False


def test_hit_wicket_off_noball_record_ball_rejected():
    """Verify record_ball raises RuleViolationError on hit-wicket off a noball."""
    agg = InningsAggregate.reconstruct(
        innings_id=1,
        match_id=1,
        match_format="t20",
        target=None,
        deliveries=[],
        current_striker_id=10,
        current_non_striker_id=11,
        current_bowler_id=20,
    )

    with pytest.raises(RuleViolationError) as exc:
        agg.record_ball(
            bowler_id=20,
            runs=0,
            extra_type=ExtraType.NOBALL,
            extras=1,
            wicket_type=WicketType.HIT_WICKET,
            player_out_id=10,
            fielder_id=None,
            new_batter_id=12,
        )
    assert "cannot be dismissed hit_wicket off a no-ball" in exc.value.detail


def test_stumped_requires_designated_wicket_keeper_when_specified():
    """Verify that only the designated wicket-keeper can execute a stumping when keeper is specified."""
    # Outfield fielder attempting stumping -> rejected
    with pytest.raises(RuleViolationError) as exc:
        InningsAggregate.validate_delivery_state(
            runs=0,
            extra_type=None,
            extras=0,
            wicket_type=WicketType.STUMPED,
            player_out_id=10,
            fielder_id=50,  # Outfield player
            striker_id=10,
            non_striker_id=11,
            bowler_id=20,
            wicket_keeper_id=99,  # Designated keeper
        )
    assert "Only the designated wicket-keeper (99) can execute a stumping" in exc.value.detail

    # Designated keeper executing stumping -> accepted
    InningsAggregate.validate_delivery_state(
        runs=0,
        extra_type=None,
        extras=0,
        wicket_type=WicketType.STUMPED,
        player_out_id=10,
        fielder_id=99,  # Matches keeper
        striker_id=10,
        non_striker_id=11,
        bowler_id=20,
        wicket_keeper_id=99,
    )


def test_stumped_without_designated_wicket_keeper_specified_allows_valid_fielder():
    """When wicket_keeper_id is omitted/None, general valid fielder is accepted for backward compatibility."""
    InningsAggregate.validate_delivery_state(
        runs=0,
        extra_type=None,
        extras=0,
        wicket_type=WicketType.STUMPED,
        player_out_id=10,
        fielder_id=50,
        striker_id=10,
        non_striker_id=11,
        bowler_id=20,
        wicket_keeper_id=None,
    )


