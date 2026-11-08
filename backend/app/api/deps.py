from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.repositories.delivery import DeliveryRepository
from app.repositories.innings import InningsRepository
from app.repositories.match import MatchRepository
from app.repositories.player import PlayerRepository
from app.repositories.squad import SquadRepository
from app.repositories.team import TeamRepository
from app.services.delivery import DeliveryService
from app.services.innings import InningsService
from app.services.match import MatchService
from app.services.player import PlayerService
from app.services.scorecard import ScorecardService
from app.services.squad import SquadService
from app.services.team import TeamService


async def get_team_service(session: AsyncSession = Depends(get_db)) -> TeamService:
    team_repo = TeamRepository(session)
    return TeamService(team_repo)


async def get_player_service(session: AsyncSession = Depends(get_db)) -> PlayerService:
    player_repo = PlayerRepository(session)
    return PlayerService(player_repo)


async def get_match_service(session: AsyncSession = Depends(get_db)) -> MatchService:
    match_repo = MatchRepository(session)
    team_repo = TeamRepository(session)
    squad_repo = SquadRepository(session)
    innings_repo = InningsRepository(session)
    return MatchService(match_repo, team_repo, squad_repo, innings_repo)


async def get_squad_service(session: AsyncSession = Depends(get_db)) -> SquadService:
    squad_repo = SquadRepository(session)
    match_repo = MatchRepository(session)
    return SquadService(squad_repo, match_repo)


async def get_innings_service(session: AsyncSession = Depends(get_db)) -> InningsService:
    innings_repo = InningsRepository(session)
    match_repo = MatchRepository(session)
    delivery_repo = DeliveryRepository(session)
    squad_repo = SquadRepository(session)
    return InningsService(innings_repo, match_repo, delivery_repo, squad_repo)


async def get_delivery_service(session: AsyncSession = Depends(get_db)) -> DeliveryService:
    delivery_repo = DeliveryRepository(session)
    innings_repo = InningsRepository(session)
    match_repo = MatchRepository(session)
    squad_repo = SquadRepository(session)
    return DeliveryService(delivery_repo, innings_repo, match_repo, squad_repo)


async def get_scorecard_service(session: AsyncSession = Depends(get_db)) -> ScorecardService:
    match_repo = MatchRepository(session)
    innings_repo = InningsRepository(session)
    delivery_repo = DeliveryRepository(session)
    player_repo = PlayerRepository(session)
    team_repo = TeamRepository(session)
    return ScorecardService(match_repo, innings_repo, delivery_repo, player_repo, team_repo)
