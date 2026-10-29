from typing import Iterable
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.team import Team


class TeamRepository:
    """
    Handles all direct database queries for Teams.
    No HTTP code and no business logic here—only SQL queries.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, name: str) -> Team:
        """Inserts a new team into the database."""
        team = Team(name=name)
        self.session.add(team)
        await self.session.flush()
        await self.session.refresh(team)
        return team

    async def get_by_id(self, team_id: int) -> Team | None:
        """Finds a team by its primary key ID."""
        query = select(Team).where(Team.id == team_id)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_by_ids(self, team_ids: Iterable[int]) -> dict[int, Team]:
        """Batch fetches teams by IDs. Returns a mapping of ID -> Team."""
        ids_list = list(set(team_ids))
        if not ids_list:
            return {}
        query = select(Team).where(Team.id.in_(ids_list))
        result = await self.session.execute(query)
        teams = result.scalars().all()
        return {t.id: t for t in teams}

    async def get_by_name(self, name: str) -> Team | None:
        """Finds a team by its unique name."""
        query = select(Team).where(Team.name == name)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def list_all(
        self,
        limit: int = 20,
        offset: int = 0,
        search: str | None = None,
    ) -> list[Team]:
        """Lists teams with optional search and pagination."""
        query = select(Team)
        if search:
            query = query.where(Team.name.ilike(f"%{search}%"))
        query = query.order_by(Team.id).offset(offset).limit(limit)

        result = await self.session.execute(query)
        return list(result.scalars().all())
