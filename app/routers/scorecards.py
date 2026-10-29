from fastapi import APIRouter, Depends
from app.schemas.scorecard import InningsScorecard, LiveMatchResponse, MatchScorecardResponse
from app.services.scorecard import ScorecardService, get_scorecard_service

router = APIRouter(prefix="/matches", tags=["Scorecard"])


@router.get(
    "/{match_id}/live",
    response_model=LiveMatchResponse,
    summary="Get live match ticker snapshot",
)
async def get_live_ticker(
    match_id: int,
    service: ScorecardService = Depends(get_scorecard_service),
) -> LiveMatchResponse:
    return await service.get_live_match_state(match_id)


@router.get(
    "/{match_id}/scorecard",
    response_model=MatchScorecardResponse,
    summary="Get complete match scorecard (all innings)",
)
async def get_scorecard(
    match_id: int,
    service: ScorecardService = Depends(get_scorecard_service),
) -> MatchScorecardResponse:
    return await service.get_match_scorecard(match_id)


@router.get(
    "/{match_id}/innings/{innings_number}/scorecard",
    response_model=InningsScorecard,
    summary="Get scorecard for a specific innings",
)
async def get_single_innings_scorecard(
    match_id: int,
    innings_number: int,
    service: ScorecardService = Depends(get_scorecard_service),
) -> InningsScorecard:
    return await service.get_innings_scorecard(match_id, innings_number)
