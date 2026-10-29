from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.domain.exceptions import EntityNotFoundError
from app.models.player import Player
from app.repositories.player import PlayerRepository
from app.schemas.enums import Role
from app.schemas.player import PlayerCreate


class PlayerService:
    """
    Business logic layer for Player operations.
    Decoupled from HTTP frameworks; raises domain exceptions.
    """

    def __init__(self, repository: PlayerRepository):
        self.repository = repository

    async def create_player(self, player_in: PlayerCreate) -> Player:
        """Creates a new player."""
        return await self.repository.create(player_in)

    async def get_player(self, player_id: int) -> Player:
        """Retrieves a player by ID, raising EntityNotFoundError if not found."""
        player = await self.repository.get_by_id(player_id)
        if not player:
            raise EntityNotFoundError(f"Player with ID {player_id} not found")
        return player

    async def list_players(
        self,
        role: Role | None = None,
        search: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> list[Player]:
        """Lists players with optional role and search filters."""
        return await self.repository.list_all(role=role, search=search, limit=limit, offset=offset)


async def get_player_service(session: AsyncSession = Depends(get_db)) -> PlayerService:
    """FastAPI dependency for injecting PlayerService."""
    repository = PlayerRepository(session)
    return PlayerService(repository)
