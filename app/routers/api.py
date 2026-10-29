"""
Central API router combining all individual resource routers under a single versioned prefix.
Configurable via settings.API_V1_PREFIX.
"""

from fastapi import APIRouter
from app.config import settings
from app.routers import deliveries, innings, matches, players, scorecards, squads, teams

api_router = APIRouter(prefix=settings.API_V1_PREFIX)

api_router.include_router(teams.router)
api_router.include_router(players.router)
api_router.include_router(matches.router)
api_router.include_router(squads.router)
api_router.include_router(innings.router)
api_router.include_router(deliveries.router)
api_router.include_router(scorecards.router)
