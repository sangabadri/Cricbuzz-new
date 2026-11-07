from fastapi import APIRouter, Depends, Query, status
from app.models.match import Match
from app.schemas.enums import MatchStatus
from app.schemas.match import MatchCreate, MatchMOM, MatchResponse, MatchToss
from app.services.match import MatchService, get_match_service

router = APIRouter(prefix="/matches", tags=["Matches"])


@router.post(
    "/",
    response_model=MatchResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Schedule a new match",
)
async def create_match(
    match_in: MatchCreate,
    service: MatchService = Depends(get_match_service),
) -> Match:
    return await service.create_match(match_in)


@router.get(
    "/{match_id}",
    response_model=MatchResponse,
    summary="Get match details by ID",
)
async def get_match(
    match_id: int,
    service: MatchService = Depends(get_match_service),
) -> Match:
    return await service.get_match(match_id)


@router.get(
    "/",
    response_model=list[MatchResponse],
    summary="List matches with optional status and team filters",
)
async def list_matches(
    status: MatchStatus | None = Query(None, description="Filter by status (scheduled, live, completed, etc.)"),
    team_id: int | None = Query(None, description="Filter by participating team ID"),
    limit: int = Query(20, ge=1, le=100, description="Max matches to return"),
    offset: int = Query(0, ge=0, description="Number of matches to skip"),
    service: MatchService = Depends(get_match_service),
) -> list[Match]:
    return await service.list_matches(
        status=status, team_id=team_id, limit=limit, offset=offset
    )


@router.post(
    "/{match_id}/toss",
    response_model=MatchResponse,
    summary="Conduct match toss",
)
async def conduct_toss(
    match_id: int,
    toss: MatchToss,
    service: MatchService = Depends(get_match_service),
) -> Match:
    return await service.conduct_toss(match_id, toss)


@router.post(
    "/{match_id}/abandon",
    response_model=MatchResponse,
    summary="Abandon a match",
)
async def abandon_match(
    match_id: int,
    service: MatchService = Depends(get_match_service),
) -> Match:
    return await service.abandon_match(match_id)


@router.post(
    "/{match_id}/mom",
    response_model=MatchResponse,
    summary="Award Man of the Match",
)
async def award_mom(
    match_id: int,
    mom: MatchMOM,
    service: MatchService = Depends(get_match_service),
) -> Match:
    return await service.set_man_of_the_match(match_id, mom)
