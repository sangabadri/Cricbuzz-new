from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.match import Match
from app.schemas.enums import MatchStatus
from app.schemas.match import MatchCreate


class MatchRepository:
    """
    Handles all direct database queries for Matches.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, match_in: MatchCreate) -> Match:
        """Inserts a new match into the database."""
        match = Match(
            team_a=match_in.team_a,
            team_b=match_in.team_b,
            venue=match_in.venue,
            format=match_in.format,
            match_date=match_in.match_date,
            status=MatchStatus.SCHEDULED,
        )
        self.session.add(match)
        await self.session.flush()
        await self.session.refresh(match)
        return match

    async def get_by_id(self, match_id: int) -> Match | None:
        """Finds a match by ID."""
        query = select(Match).where(Match.id == match_id)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def list_all(
        self,
        status: MatchStatus | None = None,
        team_id: int | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> list[Match]:
        """Lists matches with optional status and team filtering."""
        query = select(Match)
        if status:
            query = query.where(Match.status == status)
        if team_id:
            query = query.where(or_(Match.team_a == team_id, Match.team_b == team_id))
        query = query.order_by(Match.match_date.desc()).offset(offset).limit(limit)

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def save(self, match: Match) -> Match:
        """Flushes and refreshes an updated match entity."""
        await self.session.flush()
        await self.session.refresh(match)
        return match
