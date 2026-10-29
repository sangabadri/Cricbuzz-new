from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.innings import Innings
from app.schemas.enums import InningsStatus
from app.schemas.innings import InningsCreate


class InningsRepository:
    """
    Handles all direct database queries for Innings.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, match_id: int, innings_in: InningsCreate) -> Innings:
        """Creates and saves a new innings row."""
        innings = Innings(
            match_id=match_id,
            innings_number=innings_in.innings_number,
            batting_team_id=innings_in.batting_team_id,
            bowling_team_id=innings_in.bowling_team_id,
            status=InningsStatus.NOT_STARTED,
            target=innings_in.target,
        )
        self.session.add(innings)
        await self.session.flush()
        await self.session.refresh(innings)
        return innings

    async def get_by_match_and_number(self, match_id: int, innings_number: int) -> Innings | None:
        """Finds an innings by match ID and innings number (1 or 2)."""
        query = select(Innings).where(
            Innings.match_id == match_id,
            Innings.innings_number == innings_number,
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def list_by_match(self, match_id: int) -> list[Innings]:
        """Lists all innings for a match ordered by innings number."""
        query = select(Innings).where(Innings.match_id == match_id).order_by(Innings.innings_number)
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def save(self, innings: Innings) -> Innings:
        """Flushes and refreshes an updated innings."""
        await self.session.flush()
        await self.session.refresh(innings)
        return innings
