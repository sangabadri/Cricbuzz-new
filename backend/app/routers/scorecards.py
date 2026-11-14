import json
from collections.abc import AsyncIterator
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from app.api.deps import get_scorecard_service, get_match_repo
from app.repositories.match import MatchRepository
from app.schemas.scorecard import InningsScorecard, LiveMatchResponse, MatchScorecardResponse
from app.services.event_bus import match_event_bus
from app.services.scorecard import ScorecardService

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


async def sse_match_event_generator(match_id: int) -> AsyncIterator[str]:
    """Yields W3C standard Server-Sent Events (SSE) for a live match."""
    initial_payload = json.dumps({"match_id": match_id, "status": "connected"})
    yield f"event: connected\ndata: {initial_payload}\n\n"

    async for item in match_event_bus.subscribe(match_id):
        event_name = item.get("event", "message")
        event_data = json.dumps(item.get("data", {}))
        yield f"event: {event_name}\ndata: {event_data}\n\n"


@router.get(
    "/{match_id}/live-stream",
    summary="Real-time Server-Sent Events (SSE) live match push stream",
)
async def get_live_match_stream(
    match_id: int,
    match_repo: MatchRepository = Depends(get_match_repo),
):
    """
    Establishes an open unidirectional HTTP stream for live spectators.
    Pushes delivery_recorded, match_updated, and heartbeat pings in real time.
    """
    match = await match_repo.get_by_id(match_id)
    if not match:
        raise HTTPException(status_code=404, detail=f"Match with ID {match_id} not found")

    return StreamingResponse(
        sse_match_event_generator(match_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
