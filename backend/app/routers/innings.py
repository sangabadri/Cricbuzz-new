from fastapi import APIRouter, Depends, status
from app.api.deps import get_innings_service, require_match_access
from app.domain.enums import MatchUserRole
from app.models.innings import Innings
from app.schemas.innings import InningsResponse, StartInningsRequest
from app.services.innings import InningsService

router = APIRouter(prefix="/matches", tags=["Innings"])


@router.post(
    "/{match_id}/innings/{innings_number}/start",
    response_model=InningsResponse,
    status_code=status.HTTP_200_OK,
    summary="Start an innings by setting openers and opening bowler",
    dependencies=[Depends(require_match_access([MatchUserRole.OWNER, MatchUserRole.SCORER]))],
)
async def start_innings(
    match_id: int,
    innings_number: int,
    start_req: StartInningsRequest,
    service: InningsService = Depends(get_innings_service),
) -> Innings:
    return await service.start_innings(match_id, innings_number, start_req)


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
