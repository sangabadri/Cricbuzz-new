from fastapi import APIRouter, Depends, status
from app.models.delivery import Delivery
from app.schemas.delivery import BallEventCreate, DeliveryCreate, DeliveryResponse, ManualDeliveryUpdate
from app.services.delivery import DeliveryService, get_delivery_service

router = APIRouter(prefix="/matches", tags=["Deliveries"])


@router.post(
    "/{match_id}/innings/{innings_number}/deliveries",
    response_model=DeliveryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record a delivery (ball bowled with explicit player IDs)",
)
async def create_delivery(
    match_id: int,
    innings_number: int,
    delivery_in: DeliveryCreate,
    service: DeliveryService = Depends(get_delivery_service),
) -> Delivery:
    return await service.record_delivery(match_id, innings_number, delivery_in)


@router.post(
    "/{match_id}/innings/{innings_number}/ball-events",
    response_model=DeliveryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record a ball event (domain aggregate auto-determines crease, over, and strike)",
)
async def record_ball_event(
    match_id: int,
    innings_number: int,
    ball_in: BallEventCreate,
    service: DeliveryService = Depends(get_delivery_service),
) -> Delivery:
    return await service.record_delivery(match_id, innings_number, ball_in)


@router.put(
    "/{match_id}/innings/{innings_number}/deliveries/last",
    response_model=DeliveryResponse,
    summary="Modify the last recorded delivery",
)
async def modify_last_delivery(
    match_id: int,
    innings_number: int,
    delivery_in: DeliveryCreate,
    service: DeliveryService = Depends(get_delivery_service),
) -> Delivery:
    return await service.update_last_delivery(match_id, innings_number, delivery_in)


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
