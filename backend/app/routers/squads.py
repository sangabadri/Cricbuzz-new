from fastapi import APIRouter, Depends, status
from app.models.squad import Squad
from app.schemas.squad import SquadCreate, SquadResponse
from app.services.squad import SquadService, get_squad_service

router = APIRouter(prefix="/matches", tags=["Squads"])


@router.post(
    "/{match_id}/squad",
    response_model=SquadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit team squad for a match",
)
async def create_squad(
    match_id: int,
    squad_in: SquadCreate,
    service: SquadService = Depends(get_squad_service),
) -> Squad:
    return await service.create_squad(match_id, squad_in)


@router.get(
    "/{match_id}/squad/{team_id}",
    response_model=SquadResponse,
    summary="Get squad of a team in a match",
)
async def get_squad(
    match_id: int,
    team_id: int,
    service: SquadService = Depends(get_squad_service),
) -> Squad:
    return await service.get_squad(match_id, team_id)
