import pytest
from app.domain.rules.formats import (
    MatchFormatRules,
    ODIFormatRules,
    T20FormatRules,
    TestFormatRules,
    get_format_rules,
)
from app.domain.enums import MatchFormat


def test_t20_format_rules():
    rules = get_format_rules(MatchFormat.T20)
    assert isinstance(rules, T20FormatRules)
    assert rules.name == "t20"
    assert rules.max_overs == 20
    assert rules.max_bowler_overs == 4
    assert rules.balls_per_over == 6
    assert rules.total_innings == 2
    assert rules.max_wickets == 10

    # Bowler quota checks
    assert rules.can_bowler_bowl(3) is True
    assert rules.can_bowler_bowl(4, balls_in_current_over=0) is True
    assert rules.can_bowler_bowl(4, balls_in_current_over=1) is False
    assert rules.can_bowler_bowl(5) is False


def test_odi_format_rules():
    rules = get_format_rules(MatchFormat.ODI)
    assert isinstance(rules, ODIFormatRules)
    assert rules.name == "odi"
    assert rules.max_overs == 50
    assert rules.max_bowler_overs == 10

    assert rules.can_bowler_bowl(9) is True
    assert rules.can_bowler_bowl(10, balls_in_current_over=0) is True
    assert rules.can_bowler_bowl(10, balls_in_current_over=1) is False


def test_test_format_rules():
    rules = get_format_rules("test")
    assert isinstance(rules, TestFormatRules)
    assert rules.name == "test"
    assert rules.max_bowler_overs == 100
    assert rules.total_innings == 4


def test_format_factory_fallback():
    rules = get_format_rules("unknown_format")
    assert isinstance(rules, T20FormatRules)
