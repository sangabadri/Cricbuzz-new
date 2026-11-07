import pytest
from app.models.delivery import Delivery
from app.models.innings import Innings
from app.models.match import Match
from app.schemas.enums import ExtraType, InningsStatus, MatchFormat, MatchStatus, WicketType
from app.services.scorecard import to_overs_record


def test_overs_record_conversion():
    # 0 legal balls
    ov0 = to_overs_record(0)
    assert ov0.completed_overs == 0
    assert ov0.balls == 0
    assert ov0.total_legal_balls == 0

    # 5 legal balls -> 0.5
    ov5 = to_overs_record(5)
    assert ov5.completed_overs == 0
    assert ov5.balls == 5
    assert ov5.total_legal_balls == 5

    # 6 legal balls -> 1.0
    ov6 = to_overs_record(6)
    assert ov6.completed_overs == 1
    assert ov6.balls == 0
    assert ov6.total_legal_balls == 6

    # 23 legal balls -> 3.5
    ov23 = to_overs_record(23)
    assert ov23.completed_overs == 3
    assert ov23.balls == 5
    assert ov23.total_legal_balls == 23

    # 120 legal balls (20 overs in T20) -> 20.0
    ov120 = to_overs_record(120)
    assert ov120.completed_overs == 20
    assert ov120.balls == 0
    assert ov120.total_legal_balls == 120
