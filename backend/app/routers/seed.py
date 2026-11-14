"""
Seed router: Provides a 1-click endpoint to scaffold sample teams, players,
and an active live match ready for instant scoring and viewing.
"""

from fastapi import APIRouter, Depends, status
from app.api.deps import get_demo_seed_service
from app.services.demo_seed import DemoSeedService, SeedResponse

router = APIRouter(prefix="/seed", tags=["Seed / Demo"])


@router.post(
    "/demo-match",
    response_model=SeedResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Seed a ready-to-score demo match (India vs Australia)",
)
async def seed_demo_match(
    seed_svc: DemoSeedService = Depends(get_demo_seed_service),
) -> SeedResponse:
    """Delegates demo match generation to DemoSeedService."""
    return await seed_svc.seed_demo_match()
