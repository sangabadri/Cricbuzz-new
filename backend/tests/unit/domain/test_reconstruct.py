import pytest
from app.domain.enums import ExtraType, InningsStatus, MatchFormat, WicketType
from app.domain.innings_aggregate import InningsAggregate


def test_reconstruct_empty_deliveries():
    agg = InningsAggregate.reconstruct(
        innings_id=1,
        match_id=10,
        match_format=MatchFormat.T20,
        target=None,
        deliveries=[],
        status=InningsStatus.NOT_STARTED,
    )
    assert agg.innings_id == 1
    assert agg.match_id == 10
    assert agg.total_runs == 0
    assert agg.total_wickets == 0
    assert agg.total_legal_balls == 0
    assert agg.current_over == 0
    assert agg.current_ball_in_over == 0
    assert agg.crease.striker_id is None
    assert agg.crease.non_striker_id is None
    assert agg.is_completed is False


def test_reconstruct_strike_rotation_and_runs():
    deliveries = [
        {
            "delivery_index": 1,
            "over": 0,
            "ball": 1,
            "bowler_id": 100,
            "batsman_id": 1,
            "non_striker_id": 2,
            "runs": 1,
            "extra_type": None,
            "extras": 0,
            "wicket_type": None,
            "player_out_id": None,
            "fielder_id": None,
        },
        {
            "delivery_index": 2,
            "over": 0,
            "ball": 2,
            "bowler_id": 100,
            "batsman_id": 2,
            "non_striker_id": 1,
            "runs": 4,
            "extra_type": None,
            "extras": 0,
            "wicket_type": None,
            "player_out_id": None,
            "fielder_id": None,
        },
    ]

    agg = InningsAggregate.reconstruct(
        innings_id=1,
        match_id=10,
        match_format=MatchFormat.T20,
        target=None,
        deliveries=deliveries,
    )

    assert agg.total_runs == 5
    assert agg.total_legal_balls == 2
    assert agg.current_ball_in_over == 2
    assert agg.crease.striker_id == 2
    assert agg.crease.non_striker_id == 1


def test_reconstruct_over_completion_and_strike_swap():
    # 6 dot balls by bowler 100 to batter 1
    deliveries = [
        {
            "delivery_index": i,
            "over": 0,
            "ball": i,
            "bowler_id": 100,
            "batsman_id": 1,
            "non_striker_id": 2,
            "runs": 0,
            "extra_type": None,
            "extras": 0,
            "wicket_type": None,
            "player_out_id": None,
            "fielder_id": None,
        }
        for i in range(1, 7)
    ]

    agg = InningsAggregate.reconstruct(
        innings_id=1,
        match_id=10,
        match_format=MatchFormat.T20,
        target=None,
        deliveries=deliveries,
    )

    assert agg.total_legal_balls == 6
    assert agg.completed_overs == 1
    assert agg.current_over == 1
    assert agg.current_ball_in_over == 0
    assert agg.bowler_overs[100] == 1
    assert agg.last_completed_over_bowler_id == 100
    # Over concluded -> batters swapped ends
    assert agg.crease.striker_id == 2
    assert agg.crease.non_striker_id == 1


def test_reconstruct_incoming_batter_on_crease():
    # Ball 1: Batter 1 out caught (bowler 100, caught by 101), incoming batter is 3
    deliveries = [
        {
            "delivery_index": 1,
            "over": 0,
            "ball": 1,
            "bowler_id": 100,
            "batsman_id": 1,
            "non_striker_id": 2,
            "runs": 0,
            "extra_type": None,
            "extras": 0,
            "wicket_type": WicketType.CAUGHT,
            "player_out_id": 1,
            "fielder_id": 101,
            "new_batter_id": 3,
        }
    ]

    agg = InningsAggregate.reconstruct(
        innings_id=1,
        match_id=10,
        match_format=MatchFormat.T20,
        target=None,
        deliveries=deliveries,
    )

    assert agg.total_wickets == 1
    assert 1 in agg.crease.dismissed_player_ids
    # Incoming batter 3 takes strike
    assert agg.crease.striker_id == 3
    assert agg.crease.non_striker_id == 2


def test_reconstruct_bowler_return_catch():
    # Bowler caught and bowled (fielder_id == bowler_id)
    deliveries = [
        {
            "delivery_index": 1,
            "over": 0,
            "ball": 1,
            "bowler_id": 100,
            "batsman_id": 1,
            "non_striker_id": 2,
            "runs": 0,
            "extra_type": None,
            "extras": 0,
            "wicket_type": WicketType.CAUGHT,
            "player_out_id": 1,
            "fielder_id": 100,  # Bowler took return catch
            "new_batter_id": 3,
        }
    ]

    agg = InningsAggregate.reconstruct(
        innings_id=1,
        match_id=10,
        match_format=MatchFormat.T20,
        target=None,
        deliveries=deliveries,
    )

    assert agg.total_wickets == 1
    assert agg.crease.striker_id == 3
    assert agg.crease.non_striker_id == 2


def test_reconstruct_run_out_crossing():
    # Striker (1) runs 1 run, run out attempting second run.
    # Batters crossed once before dismissal.
    # Player out: 1, new batter: 3.
    deliveries = [
        {
            "delivery_index": 1,
            "over": 0,
            "ball": 1,
            "bowler_id": 100,
            "batsman_id": 1,
            "non_striker_id": 2,
            "runs": 1,
            "extra_type": None,
            "extras": 0,
            "wicket_type": WicketType.RUN_OUT,
            "player_out_id": 1,
            "fielder_id": 102,
            "new_batter_id": 3,
        }
    ]

    agg = InningsAggregate.reconstruct(
        innings_id=1,
        match_id=10,
        match_format=MatchFormat.T20,
        target=None,
        deliveries=deliveries,
    )

    assert agg.total_runs == 1
    assert agg.total_wickets == 1
    assert 1 in agg.crease.dismissed_player_ids
    # Because of crossing on 1 completed run, player 2 is at striker's end, incoming batter 3 is at non-striker's end
    assert agg.crease.striker_id == 2
    assert agg.crease.non_striker_id == 3


def test_reconstruct_target_reached():
    deliveries = [
        {
            "delivery_index": 1,
            "over": 0,
            "ball": 1,
            "bowler_id": 100,
            "batsman_id": 1,
            "non_striker_id": 2,
            "runs": 6,
            "extra_type": None,
            "extras": 0,
            "wicket_type": None,
            "player_out_id": None,
            "fielder_id": None,
        }
    ]

    agg = InningsAggregate.reconstruct(
        innings_id=2,
        match_id=10,
        match_format=MatchFormat.T20,
        target=6,
        deliveries=deliveries,
    )

    assert agg.is_completed is True
    assert "Target of 6 runs reached" in agg.completion_reason


def test_reconstruct_with_orm_like_objects():
    class DummyDelivery:
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)

    deliveries = [
        DummyDelivery(
            delivery_index=1,
            over=0,
            ball=1,
            bowler_id=50,
            batsman_id=10,
            non_striker_id=20,
            runs=1,
            extra_type=None,
            extras=0,
            wicket_type=None,
            player_out_id=None,
            fielder_id=None,
            new_batter_id=None,
            commentary="Single taken",
        ),
        DummyDelivery(
            delivery_index=2,
            over=0,
            ball=2,
            bowler_id=50,
            batsman_id=20,
            non_striker_id=10,
            runs=0,
            extra_type=ExtraType.WIDE,
            extras=1,
            wicket_type=None,
            player_out_id=None,
            fielder_id=None,
            new_batter_id=None,
            commentary="Wide ball",
        ),
    ]

    agg = InningsAggregate.reconstruct(
        innings_id=1,
        match_id=5,
        match_format=MatchFormat.T20,
        target=None,
        deliveries=deliveries,
    )

    assert agg.total_runs == 2
    assert agg.total_legal_balls == 1
    assert agg.current_ball_in_over == 1
    assert agg.crease.striker_id == 20
    assert agg.crease.non_striker_id == 10


def test_reconstruct_all_out():
    # 10 wickets fall
    deliveries = []
    current_striker = 1
    for w in range(1, 11):
        incoming = 100 + w if w < 10 else None
        deliveries.append({
            "delivery_index": w,
            "over": 0 if w <= 6 else 1,
            "ball": w if w <= 6 else w - 6,
            "bowler_id": 50 if w <= 6 else 51,
            "batsman_id": current_striker,
            "non_striker_id": 2,
            "runs": 0,
            "extra_type": None,
            "extras": 0,
            "wicket_type": WicketType.BOWLED,
            "player_out_id": current_striker,
            "fielder_id": None,
            "new_batter_id": incoming,
        })
        current_striker = incoming

    agg = InningsAggregate.reconstruct(
        innings_id=1,
        match_id=1,
        match_format=MatchFormat.T20,
        target=None,
        deliveries=deliveries,
    )

    assert agg.total_wickets == 10
    assert agg.is_completed is True
    assert "All out" in agg.completion_reason
