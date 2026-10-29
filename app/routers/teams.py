from fastapi import APIRouter, Depends, Query, status
from app.models.team import Team
from app.schemas.team import TeamCreate, TeamResponse
from app.services.team import TeamService, get_team_service

router = APIRouter(prefix="/teams", tags=["Teams"])


@router.post(
    "/",
    response_model=TeamResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new team",
)
async def create_team(
    team_in: TeamCreate,
    service: TeamService = Depends(get_team_service),
) -> Team:
    return await service.create_team(team_in)


@router.get(
    "/{team_id}",
    response_model=TeamResponse,
    summary="Get team by ID",
)
async def get_team(
    team_id: int,
    service: TeamService = Depends(get_team_service),
) -> Team:
    return await service.get_team(team_id)


@router.get(
    "/",
    response_model=list[TeamResponse],
    summary="List all teams",
)
async def list_teams(
    search: str | None = Query(None, description="Search teams by name"),
    limit: int = Query(20, ge=1, le=100, description="Number of teams to return"),
    offset: int = Query(0, ge=0, description="Number of teams to skip"),
    service: TeamService = Depends(get_team_service),
) -> list[Team]:
    return await service.list_teams(search=search, limit=limit, offset=offset)
