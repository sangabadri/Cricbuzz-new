from fastapi import APIRouter, Depends, Query, status
from app.models.player import Player
from app.schemas.enums import Role
from app.schemas.player import PlayerCreate, PlayerResponse
from app.services.player import PlayerService, get_player_service

router = APIRouter(prefix="/players", tags=["Players"])


@router.post(
    "/",
    response_model=PlayerResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new player",
)
async def create_player(
    player_in: PlayerCreate,
    service: PlayerService = Depends(get_player_service),
) -> Player:
    return await service.create_player(player_in)


@router.get(
    "/{player_id}",
    response_model=PlayerResponse,
    summary="Get player by ID",
)
async def get_player(
    player_id: int,
    service: PlayerService = Depends(get_player_service),
) -> Player:
    return await service.get_player(player_id)


@router.get(
    "/",
    response_model=list[PlayerResponse],
    summary="List all players",
)
async def list_players(
    role: Role | None = Query(None, description="Filter players by role"),
    search: str | None = Query(None, description="Search players by name"),
    limit: int = Query(20, ge=1, le=100, description="Number of players to return"),
    offset: int = Query(0, ge=0, description="Number of players to skip"),
    service: PlayerService = Depends(get_player_service),
) -> list[Player]:
    return await service.list_players(
        role=role, search=search, limit=limit, offset=offset
    )
