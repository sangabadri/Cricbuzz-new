from fastapi import APIRouter, Depends, status
from app.models.innings import Innings
from app.schemas.innings import InningsCreate, InningsResponse
from app.services.innings import InningsService, get_innings_service

router = APIRouter(prefix="/matches", tags=["Innings"])


@router.post(
    "/{match_id}/innings",
    response_model=InningsResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start an innings for a match",
)
async def create_innings(
    match_id: int,
    innings_in: InningsCreate,
    service: InningsService = Depends(get_innings_service),
) -> Innings:
    return await service.create_innings(match_id, innings_in)


@router.get(
    "/{match_id}/innings",
    response_model=list[InningsResponse],
    summary="List all innings for a match",
)
async def list_match_innings(
    match_id: int,
    service: InningsService = Depends(get_innings_service),
) -> list[Innings]:
    return await service.list_match_innings(match_id)


@router.get(
    "/{match_id}/innings/{innings_number}",
    response_model=InningsResponse,
    summary="Get details of a specific innings",
)
async def get_innings(
    match_id: int,
    innings_number: int,
    service: InningsService = Depends(get_innings_service),
) -> Innings:
    return await service.get_innings(match_id, innings_number)
