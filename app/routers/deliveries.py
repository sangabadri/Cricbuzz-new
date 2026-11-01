from fastapi import APIRouter, Depends, status
from app.models.delivery import Delivery
from app.models.innings import Innings
from app.schemas.delivery import (
    DeliveryCreate,
    DeliveryResponse,
    LiveScorerStateResponse,
    ManualDeliveryUpdate,
    SetBowlerRequest,
    SetIncomingBatterRequest,
)
from app.schemas.innings import InningsResponse
from app.services.delivery import DeliveryService, get_delivery_service

router = APIRouter(prefix="/matches", tags=["Deliveries"])


@router.post(
    "/{match_id}/innings/{innings_number}/deliveries",
    response_model=LiveScorerStateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record a delivery for live scorer console (returns updated match & crease state)",
)
async def record_delivery(
    match_id: int,
    innings_number: int,
    delivery_in: DeliveryCreate,
    service: DeliveryService = Depends(get_delivery_service),
) -> LiveScorerStateResponse:
    await service.record_delivery(match_id, innings_number, delivery_in)
    return await service.get_live_scorer_state(match_id, innings_number)


@router.post(
    "/{match_id}/innings/{innings_number}/set-bowler",
    response_model=InningsResponse,
    status_code=status.HTTP_200_OK,
    summary="Assign the bowler for the upcoming over",
)
async def set_bowler(
    match_id: int,
    innings_number: int,
    req: SetBowlerRequest,
    service: DeliveryService = Depends(get_delivery_service),
) -> Innings:
    return await service.set_bowler(match_id, innings_number, req.bowler_id)


@router.post(
    "/{match_id}/innings/{innings_number}/set-incoming-batter",
    response_model=InningsResponse,
    status_code=status.HTTP_200_OK,
    summary="Assign the incoming batter after a wicket dismissal (2-step wicket flow)",
)
async def set_incoming_batter(
    match_id: int,
    innings_number: int,
    req: SetIncomingBatterRequest,
    service: DeliveryService = Depends(get_delivery_service),
) -> Innings:
    return await service.set_incoming_batter(match_id, innings_number, req.player_id)


@router.post(
    "/{match_id}/innings/{innings_number}/swap-strike",
    response_model=InningsResponse,
    status_code=status.HTTP_200_OK,
    summary="Manually swap striker and non-striker ends",
)
async def swap_strike(
    match_id: int,
    innings_number: int,
    service: DeliveryService = Depends(get_delivery_service),
) -> Innings:
    return await service.swap_strike(match_id, innings_number)


@router.get(
    "/{match_id}/innings/{innings_number}/scorer-state",
    response_model=LiveScorerStateResponse,
    summary="Get real-time operational state for the scorer console",
)
async def get_scorer_state(
    match_id: int,
    innings_number: int,
    service: DeliveryService = Depends(get_delivery_service),
) -> LiveScorerStateResponse:
    return await service.get_live_scorer_state(match_id, innings_number)


@router.patch(
    "/{match_id}/innings/{innings_number}/deliveries/last",
    response_model=DeliveryResponse,
    summary="Correct specific fields of the last recorded delivery",
)
async def patch_last_delivery(
    match_id: int,
    innings_number: int,
    delivery_in: ManualDeliveryUpdate,
    service: DeliveryService = Depends(get_delivery_service),
) -> Delivery:
    return await service.update_last_delivery(match_id, innings_number, delivery_in)


@router.delete(
    "/{match_id}/innings/{innings_number}/deliveries/last",
    response_model=DeliveryResponse,
    summary="Undo the last recorded delivery",
)
async def undo_last_delivery(
    match_id: int,
    innings_number: int,
    service: DeliveryService = Depends(get_delivery_service),
) -> Delivery:
    return await service.undo_last_delivery(match_id, innings_number)


@router.get(
    "/{match_id}/innings/{innings_number}/deliveries",
    response_model=list[DeliveryResponse],
    summary="List all deliveries in an innings",
)
async def get_deliveries(
    match_id: int,
    innings_number: int,
    service: DeliveryService = Depends(get_delivery_service),
) -> list[Delivery]:
    return await service.get_innings_deliveries(match_id, innings_number)
