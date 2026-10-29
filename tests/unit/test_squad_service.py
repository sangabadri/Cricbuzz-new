import functools
import pytest
from unittest.mock import AsyncMock
from app.domain.exceptions import EntityNotFoundError, RuleViolationError
from app.models.match import Match
from app.models.squad import Squad, SquadPlayer
from app.schemas.enums import MatchFormat, MatchStatus
from app.schemas.squad import SquadCreate, SquadPlayerItem
from app.services.squad import SquadService


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
    squad_repo = AsyncMock()
    match_repo = AsyncMock()
    return squad_repo, match_repo


def make_sample_squad(team_id: int, player_ids: list[int], captain_id: int, wk_id: int) -> SquadCreate:
    return SquadCreate(
        team_id=team_id,
        captain_id=captain_id,
        wicket_keeper_id=wk_id,
        players=[SquadPlayerItem(player_id=pid, is_playing_xi=True) for pid in player_ids],
    )


@sync
async def test_squad_creation_success(mock_repos):
    squad_repo, match_repo = mock_repos
    match = Match(id=1, team_a=10, team_b=20, venue="Wankhede", format=MatchFormat.T20, status=MatchStatus.SCHEDULED)
    match_repo.get_by_id.return_value = match
    squad_repo.get_by_match_and_team.return_value = None
    squad_repo.create.side_effect = lambda m_id, s_in: Squad(
        id=1, match_id=m_id, team_id=s_in.team_id, captain_id=s_in.captain_id, wicket_keeper_id=s_in.wicket_keeper_id
    )

    service = SquadService(squad_repo, match_repo)
    p_ids = list(range(1, 12))  # 11 players: 1..11
    squad = await service.create_squad(1, make_sample_squad(10, p_ids, captain_id=1, wk_id=2))
    assert squad.team_id == 10
    assert squad.captain_id == 1


@sync
async def test_squad_rejects_player_in_both_teams(mock_repos):
    squad_repo, match_repo = mock_repos
    match = Match(id=1, team_a=10, team_b=20, venue="Wankhede", format=MatchFormat.T20, status=MatchStatus.SCHEDULED)
    match_repo.get_by_id.return_value = match

    # Team 10 already submitted squad with players 1..11
    team_10_squad = Squad(
        id=1,
        match_id=1,
        team_id=10,
        captain_id=1,
        wicket_keeper_id=2,
    )
    team_10_squad.players = [
        SquadPlayer(id=i, squad_id=1, player_id=i, is_playing_xi=True)
        for i in range(1, 12)
    ]

    # When querying squad: None for Team 20 (not submitted yet), team_10_squad for Team 10
    squad_repo.get_by_match_and_team.side_effect = lambda m_id, t_id: team_10_squad if t_id == 10 else None

    service = SquadService(squad_repo, match_repo)

    # Team 20 tries to submit squad containing player 5 (who is already in Team 10's squad!)
    team_20_players = [5] + list(range(12, 22))  # [5, 12..21] -> 11 players
    with pytest.raises(RuleViolationError) as exc:
        await service.create_squad(1, make_sample_squad(20, team_20_players, captain_id=12, wk_id=13))

    assert "already registered in the opposing team's squad for Match 1" in exc.value.detail
    assert "5" in exc.value.detail
