from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from app.database import engine
from app.domain.exceptions import (
    CricketDomainError,
    EntityNotFoundError,
    RuleViolationError,
    CreaseViolationError,
    OverProgressionError,
)
from app.models.base import Base
# Import all models here so that Base.metadata knows about them on startup
from app.models.team import Team
from app.models.player import Player
from app.models.match import Match
from app.models.squad import Squad, SquadPlayer
from app.models.innings import Innings
from app.models.delivery import Delivery
from app.routers.api import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan events: runs before the server starts accepting requests
    and cleans up when the server shuts down.
    """
    # Create all database tables if they do not exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="Cricbuzz API",
    description="Cricket scoring and tracking backend",
    version="1.0.0",
    lifespan=lifespan,
)


DOMAIN_EXCEPTION_STATUS_MAP: dict[type[CricketDomainError], int] = {
    EntityNotFoundError: 404,
    RuleViolationError: 400,
    CreaseViolationError: 400,
    OverProgressionError: 400,
}


@app.exception_handler(CricketDomainError)
async def domain_exception_handler(request: Request, exc: CricketDomainError):
    """
    Global exception handler translating pure domain exceptions into appropriate HTTP responses.
    """
    status_code = DOMAIN_EXCEPTION_STATUS_MAP.get(type(exc), 404 if isinstance(exc, EntityNotFoundError) else 400)
    return JSONResponse(
        status_code=status_code,
        content={"detail": exc.message},
    )


# Include versioned API Router
app.include_router(api_router)


@app.get("/", tags=["General"])
async def root():
    return {
        "message": "Welcome to Cricbuzz API",
        "docs": "/docs",
        "version": "1.0.0",
    }


@app.get("/health", tags=["General"])
async def health_check():
    return {"status": "ok"}
