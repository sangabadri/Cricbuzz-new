from typing import Iterable
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.player import Player
from app.schemas.enums import Role
from app.schemas.player import PlayerCreate


class PlayerRepository:
    """
    Handles all direct database queries for Players.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, player_in: PlayerCreate) -> Player:
        """Inserts a new player into the database."""
        player = Player(
            name=player_in.name,
            role=player_in.role,
            batting=player_in.batting,
            bowling=player_in.bowling,
        )
        self.session.add(player)
        await self.session.flush()
        await self.session.refresh(player)
        return player

    async def get_by_id(self, player_id: int) -> Player | None:
        """Finds a player by ID."""
        query = select(Player).where(Player.id == player_id)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_by_ids(self, player_ids: Iterable[int]) -> dict[int, Player]:
        """Batch fetches players by IDs to eliminate N+1 queries. Returns a mapping of ID -> Player."""
        ids_list = list(set(player_ids))
        if not ids_list:
            return {}
        query = select(Player).where(Player.id.in_(ids_list))
        result = await self.session.execute(query)
        players = result.scalars().all()
        return {p.id: p for p in players}

    async def list_all(
        self,
        role: Role | None = None,
        search: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> list[Player]:
        """Lists players with optional filtering by role and name search."""
        query = select(Player)
        if role:
            query = query.where(Player.role == role)
        if search:
            query = query.where(Player.name.ilike(f"%{search}%"))
        query = query.order_by(Player.id).offset(offset).limit(limit)

        result = await self.session.execute(query)
        return list(result.scalars().all())
