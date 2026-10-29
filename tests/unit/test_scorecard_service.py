import functools
import pytest
from unittest.mock import AsyncMock
from app.models.delivery import Delivery
from app.models.innings import Innings
from app.models.match import Match
from app.models.player import Player
from app.models.team import Team
from app.schemas.enums import BattingStyle, ExtraType, InningsStatus, MatchFormat, MatchStatus, Role, WicketType
from app.services.scorecard import ScorecardService, to_overs_record


def sync(async_fn):
    """Synchronous coroutine runner for mock-driven service tests without Windows socket deadlocks."""
    @functools.wraps(async_fn)
    def wrapper(*args, **kwargs):
        coro = async_fn(*args, **kwargs)
        val = None
        try:
            while True:
                val = coro.send(val)
        except StopIteration as exc:
            return exc.value
    return wrapper


@pytest.fixture
def mock_repos():
    match_repo = AsyncMock()
    innings_repo = AsyncMock()
    delivery_repo = AsyncMock()
    player_repo = AsyncMock()
    team_repo = AsyncMock()
    return match_repo, innings_repo, delivery_repo, player_repo, team_repo


@sync
async def test_scorecard_batch_query_eliminates_n_plus_one(mock_repos):
    match_repo, innings_repo, delivery_repo, player_repo, team_repo = mock_repos

    # Setup test objects
    innings = Innings(
        id=1,
        match_id=1,
        innings_number=1,
        batting_team_id=10,
        bowling_team_id=20,
        status=InningsStatus.IN_PROGRESS,
    )
    match = Match(
        id=1,
        team_a=10,
        team_b=20,
        venue="Lord's",
        format=MatchFormat.T20,
        status=MatchStatus.LIVE,
    )

    team_10 = Team(id=10, name="India")
    team_20 = Team(id=20, name="Australia")
    team_repo.get_by_ids.return_value = {10: team_10, 20: team_20}

    # Deliveries: 3 balls
    # Ball 1: Bowler 100 to Batter 1 (1 run)
    # Ball 2: Bowler 100 to Batter 2 (4 runs)
    # Ball 3: Bowler 100 to Batter 2 (caught by fielder 101)
    deliveries = [
        Delivery(
            id=1,
            innings_id=1,
            delivery_index=1,
            over=0,
            ball=1,
            bowler_id=100,
            batsman_id=1,
            non_striker_id=2,
            runs=1,
            extra_type=None,
            extras=0,
            wicket_type=None,
            player_out_id=None,
            fielder_id=None,
        ),
        Delivery(
            id=2,
            innings_id=1,
            delivery_index=2,
            over=0,
            ball=2,
            bowler_id=100,
            batsman_id=2,
            non_striker_id=1,
            runs=4,
            extra_type=None,
            extras=0,
            wicket_type=None,
            player_out_id=None,
            fielder_id=None,
        ),
        Delivery(
            id=3,
            innings_id=1,
            delivery_index=3,
            over=0,
            ball=3,
            bowler_id=100,
            batsman_id=2,
            non_striker_id=1,
            runs=0,
            extra_type=None,
            extras=0,
            wicket_type=WicketType.CAUGHT,
            player_out_id=2,
            fielder_id=101,
        ),
    ]
    delivery_repo.list_by_innings.return_value = deliveries
    innings_repo.get_by_match_and_number.return_value = innings
    match_repo.get_by_id.return_value = match

    p1 = Player(id=1, name="Rohit Sharma", role=Role.BATSMAN, batting=BattingStyle.RIGHT_HANDED)
    p2 = Player(id=2, name="Virat Kohli", role=Role.BATSMAN, batting=BattingStyle.RIGHT_HANDED)
    p100 = Player(id=100, name="Mitchell Starc", role=Role.BOWLER, batting=BattingStyle.LEFT_HANDED)
    p101 = Player(id=101, name="Steve Smith", role=Role.BATSMAN, batting=BattingStyle.RIGHT_HANDED)

    # Batch return mapping
    player_repo.get_by_ids.return_value = {1: p1, 2: p2, 100: p100, 101: p101}

    service = ScorecardService(match_repo, innings_repo, delivery_repo, player_repo, team_repo)
    scorecard = await service.get_innings_scorecard(match_id=1, innings_number=1)

    # Verify batch query was called ONCE for players (no N+1 single queries)
    assert player_repo.get_by_ids.call_count == 1
    # Verify player_repo.get_by_id was NEVER called in a loop
    assert player_repo.get_by_id.call_count == 0

    # Verify score calculation
    assert scorecard.total_runs == 5
    assert scorecard.wickets == 1
    assert scorecard.overs.total_legal_balls == 3
    assert scorecard.overs.completed_overs == 0
    assert scorecard.overs.balls == 3

    # Verify batter cards
    assert len(scorecard.batting) == 2
    rohit_card = next(b for b in scorecard.batting if b.player_id == 1)
    assert rohit_card.runs == 1
    assert rohit_card.balls == 1
    assert rohit_card.is_out is False

    virat_card = next(b for b in scorecard.batting if b.player_id == 2)
    assert virat_card.runs == 4
    assert virat_card.balls == 2
    assert virat_card.fours == 1
    assert virat_card.is_out is True
    assert virat_card.dismissal.wicket_type == WicketType.CAUGHT
    assert virat_card.dismissal.bowler_name == "Mitchell Starc"
    assert virat_card.dismissal.fielder_name == "Steve Smith"

    # Verify bowler card
    assert len(scorecard.bowling) == 1
    starc_card = scorecard.bowling[0]
    assert starc_card.player_name == "Mitchell Starc"
    assert starc_card.overs.total_legal_balls == 3
    assert starc_card.runs == 5
    assert starc_card.wickets == 1

    # Verify fall of wickets
    assert len(scorecard.fall_of_wickets) == 1
    fow = scorecard.fall_of_wickets[0]
    assert fow.wicket_number == 1
    assert fow.score == 5
    assert fow.player_id == 2
    assert fow.player_name == "Virat Kohli"


@sync
async def test_live_match_crease_projection_with_wicket_and_rotation(mock_repos):
    match_repo, innings_repo, delivery_repo, player_repo, team_repo = mock_repos

    match = Match(
        id=1,
        team_a=10,
        team_b=20,
        venue="Lord's",
        format=MatchFormat.T20,
        status=MatchStatus.LIVE,
    )
    innings = Innings(
        id=1,
        match_id=1,
        innings_number=1,
        batting_team_id=10,
        bowling_team_id=20,
        status=InningsStatus.IN_PROGRESS,
    )

    team_10 = Team(id=10, name="India")
    team_20 = Team(id=20, name="Australia")
    team_repo.get_by_ids.return_value = {10: team_10, 20: team_20}

    # Ball 1: Bowler 100 to Batter 1, 1 run (Batter 2 is now striker)
    # Ball 2: Bowler 100 to Batter 2, Caught out! Incoming batter is 3.
    deliveries = [
        Delivery(
            id=1,
            innings_id=1,
            delivery_index=1,
            over=0,
            ball=1,
            bowler_id=100,
            batsman_id=1,
            non_striker_id=2,
            runs=1,
            extra_type=None,
            extras=0,
            wicket_type=None,
            player_out_id=None,
            fielder_id=None,
            new_batter_id=None,
        ),
        Delivery(
            id=2,
            innings_id=1,
            delivery_index=2,
            over=0,
            ball=2,
            bowler_id=100,
            batsman_id=2,
            non_striker_id=1,
            runs=0,
            extra_type=None,
            extras=0,
            wicket_type=WicketType.CAUGHT,
            player_out_id=2,
            fielder_id=101,
            new_batter_id=3,
        ),
    ]

    p1 = Player(id=1, name="Rohit Sharma", role=Role.BATSMAN, batting=BattingStyle.RIGHT_HANDED)
    p2 = Player(id=2, name="Virat Kohli", role=Role.BATSMAN, batting=BattingStyle.RIGHT_HANDED)
    p3 = Player(id=3, name="Suryakumar Yadav", role=Role.BATSMAN, batting=BattingStyle.RIGHT_HANDED)
    p100 = Player(id=100, name="Mitchell Starc", role=Role.BOWLER, batting=BattingStyle.LEFT_HANDED)

    match_repo.get_by_id.return_value = match
    innings_repo.list_by_match.return_value = [innings]
    innings_repo.get_by_match_and_number.return_value = innings
    delivery_repo.list_by_innings.return_value = deliveries
    player_repo.get_by_ids.return_value = {1: p1, 2: p2, 3: p3, 100: p100}

    service = ScorecardService(match_repo, innings_repo, delivery_repo, player_repo, team_repo)
    live_match = await service.get_live_match(match_id=1)

    # Active striker must be incoming batter 3, non-striker must be batter 1 (not dismissed batter 2)
    assert live_match.striker is not None
    assert live_match.striker.player_id == 3
    assert live_match.striker.name == "Suryakumar Yadav"
    assert live_match.non_striker is not None
    assert live_match.non_striker.player_id == 1
    assert live_match.non_striker.name == "Rohit Sharma"


@sync
async def test_scorecard_multiple_wickets_partnerships_and_incoming_batter_inclusion(mock_repos):
    match_repo, innings_repo, delivery_repo, player_repo, team_repo = mock_repos

    match = Match(id=1, team_a=10, team_b=20, venue="MCG", format=MatchFormat.T20, status=MatchStatus.LIVE)
    innings = Innings(id=1, match_id=1, innings_number=1, batting_team_id=10, bowling_team_id=20, status=InningsStatus.IN_PROGRESS)
    team_10 = Team(id=10, name="India")
    team_20 = Team(id=20, name="Australia")
    team_repo.get_by_ids.return_value = {10: team_10, 20: team_20}

    # Ball 1: Bowler 100 to Batter 1 (Striker), Caught! Incoming batter is 3. (1st wicket)
    # Ball 2: Bowler 100 to Batter 3, scores 4 runs.
    # Ball 3: Bowler 100 to Batter 3, Bowled! Incoming batter is 4. (2nd wicket)
    # Ball 4: Bowler 100 to Batter 4, scores 2 runs.
    deliveries = [
        Delivery(
            id=1, innings_id=1, delivery_index=1, over=0, ball=1, bowler_id=100,
            batsman_id=1, non_striker_id=2, runs=0, extra_type=None, extras=0,
            wicket_type=WicketType.CAUGHT, player_out_id=1, fielder_id=101, new_batter_id=3,
        ),
        Delivery(
            id=2, innings_id=1, delivery_index=2, over=0, ball=2, bowler_id=100,
            batsman_id=3, non_striker_id=2, runs=4, extra_type=None, extras=0,
            wicket_type=None, player_out_id=None, fielder_id=None, new_batter_id=None,
        ),
        Delivery(
            id=3, innings_id=1, delivery_index=3, over=0, ball=3, bowler_id=100,
            batsman_id=3, non_striker_id=2, runs=0, extra_type=None, extras=0,
            wicket_type=WicketType.BOWLED, player_out_id=3, fielder_id=None, new_batter_id=4,
        ),
        Delivery(
            id=4, innings_id=1, delivery_index=4, over=0, ball=4, bowler_id=100,
            batsman_id=4, non_striker_id=2, runs=2, extra_type=None, extras=0,
            wicket_type=None, player_out_id=None, fielder_id=None, new_batter_id=None,
        ),
    ]

    p1 = Player(id=1, name="Rohit", role=Role.BATSMAN, batting=BattingStyle.RIGHT_HANDED)
    p2 = Player(id=2, name="Virat", role=Role.BATSMAN, batting=BattingStyle.RIGHT_HANDED)
    p3 = Player(id=3, name="Surya", role=Role.BATSMAN, batting=BattingStyle.RIGHT_HANDED)
    p4 = Player(id=4, name="Hardik", role=Role.ALLROUNDER, batting=BattingStyle.RIGHT_HANDED)
    p100 = Player(id=100, name="Starc", role=Role.BOWLER, batting=BattingStyle.LEFT_HANDED)
    p101 = Player(id=101, name="Warner", role=Role.BATSMAN, batting=BattingStyle.LEFT_HANDED)

    innings_repo.get_by_match_and_number.return_value = innings
    delivery_repo.list_by_innings.return_value = deliveries
    player_repo.get_by_ids.return_value = {1: p1, 2: p2, 3: p3, 4: p4, 100: p100, 101: p101}

    service = ScorecardService(match_repo, innings_repo, delivery_repo, player_repo, team_repo)
    scorecard = await service.get_innings_scorecard(match_id=1, innings_number=1)

    # 1. Check all batters in scorecard
    assert len(scorecard.batting) == 4
    b_map = {b.player_id: b for b in scorecard.batting}
    assert b_map[1].is_out is True
    assert b_map[1].runs == 0
    assert b_map[3].is_out is True
    assert b_map[3].runs == 4
    assert b_map[4].is_out is False
    assert b_map[4].runs == 2
    assert b_map[2].is_out is False
    assert b_map[2].runs == 0

    # 2. Check partnerships
    assert len(scorecard.partnerships) == 3
    # Partnership 1: Wicket 1, between 1 and 2, 0 runs
    assert scorecard.partnerships[0].wicket_number == 1
    assert scorecard.partnerships[0].runs == 0
    # Partnership 2: Wicket 2, between 3 and 2, 4 runs
    assert scorecard.partnerships[1].wicket_number == 2
    assert scorecard.partnerships[1].runs == 4
    # Partnership 3: Unbroken wicket 3, between 4 and 2, 2 runs
    assert scorecard.partnerships[2].wicket_number == 3
    assert scorecard.partnerships[2].runs == 2

