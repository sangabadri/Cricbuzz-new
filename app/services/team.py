from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.domain.exceptions import EntityNotFoundError, RuleViolationError
from app.models.team import Team
from app.repositories.team import TeamRepository
from app.schemas.team import TeamCreate


class TeamService:
    """
    Business logic layer for Team operations.
    Orchestrates the repository and enforces business rules.
    Decoupled from HTTP frameworks; raises domain exceptions.
    """

    def __init__(self, repository: TeamRepository):
        self.repository = repository

    async def create_team(self, team_data: TeamCreate) -> Team:
        """Creates a new team, ensuring the name is unique."""
        existing = await self.repository.get_by_name(team_data.name)
        if existing:
            raise RuleViolationError(f"Team '{team_data.name}' already exists")
        return await self.repository.create(name=team_data.name)

    async def get_team(self, team_id: int) -> Team:
        """Retrieves a team by ID, raising EntityNotFoundError if not found."""
        team = await self.repository.get_by_id(team_id)
        if not team:
            raise EntityNotFoundError(f"Team with ID {team_id} not found")
        return team

    async def list_teams(
        self,
        limit: int = 20,
        offset: int = 0,
        search: str | None = None,
    ) -> list[Team]:
        """Lists teams with pagination and optional search."""
        return await self.repository.list_all(limit=limit, offset=offset, search=search)


# Dependency provider for FastAPI
async def get_team_service(session: AsyncSession = Depends(get_db)) -> TeamService:
    """FastAPI dependency injecting TeamService with TeamRepository."""
    repository = TeamRepository(session)
    return TeamService(repository)
