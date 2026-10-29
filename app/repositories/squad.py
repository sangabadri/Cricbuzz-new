from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.squad import Squad, SquadPlayer
from app.schemas.squad import SquadCreate


class SquadRepository:
    """
    Handles all direct database queries for Squads and SquadPlayers.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, match_id: int, squad_in: SquadCreate) -> Squad:
        """Creates a Squad and links all its SquadPlayer rows."""
        squad = Squad(
            match_id=match_id,
            team_id=squad_in.team_id,
            captain_id=squad_in.captain_id,
            wicket_keeper_id=squad_in.wicket_keeper_id,
        )
        self.session.add(squad)
        await self.session.flush()

        # Add players to the squad
        for p in squad_in.players:
            sp = SquadPlayer(
                squad_id=squad.id,
                player_id=p.player_id,
                is_playing_xi=p.is_playing_xi,
            )
            self.session.add(sp)

        await self.session.flush()
        await self.session.refresh(squad)
        return squad

    async def get_by_match_and_team(self, match_id: int, team_id: int) -> Squad | None:
        """Finds a squad for a given match and team."""
        query = select(Squad).where(Squad.match_id == match_id, Squad.team_id == team_id)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()
