import asyncio
from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.database import engine, get_db
from app.domain.exceptions import (
    CricketDomainError,
    EntityNotFoundError,
    RuleViolationError,
    CreaseViolationError,
    OverProgressionError,
    AuthenticationRequiredError,
    AccessDeniedError,
    EntityConflictError,
)
from app.models.base import Base
# Import all models here so that Base.metadata knows about them on startup
from app.models.team import Team
from app.models.player import Player
from app.models.match import Match
from app.models.squad import Squad, SquadPlayer
from app.models.innings import Innings
from app.models.delivery import Delivery
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.models.idempotency import IdempotencyRecord
from app.middleware.rate_limit import DistributedRateLimitMiddleware
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
    from app.services.event_bus import match_event_bus
    from app.services.redis_client import close_redis_client
    await match_event_bus.stop_all_listeners()
    await close_redis_client()


app = FastAPI(
    title="Cricbuzz API",
    description="Cricket scoring and tracking backend",
    version="1.0.0",
    lifespan=lifespan,
)


# Register middlewares (evaluated in reverse order of addition: CORS must be outermost)
app.add_middleware(DistributedRateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


DOMAIN_EXCEPTION_STATUS_MAP: dict[type[CricketDomainError], int] = {
    EntityNotFoundError: 404,
    RuleViolationError: 400,
    CreaseViolationError: 400,
    OverProgressionError: 400,
    AuthenticationRequiredError: 401,
    AccessDeniedError: 403,
    EntityConflictError: 409,
}


@app.exception_handler(CricketDomainError)
async def domain_exception_handler(request: Request, exc: CricketDomainError):
    """
    Global exception handler translating pure domain exceptions into appropriate HTTP responses.
    """
    if isinstance(exc, AuthenticationRequiredError):
        status_code = 401
    elif isinstance(exc, AccessDeniedError):
        status_code = 403
    elif isinstance(exc, EntityNotFoundError):
        status_code = 404
    elif isinstance(exc, EntityConflictError):
        status_code = 409
    else:
        status_code = DOMAIN_EXCEPTION_STATUS_MAP.get(type(exc), 400)

    headers = {"WWW-Authenticate": "Bearer"} if isinstance(exc, AuthenticationRequiredError) else None
    return JSONResponse(
        status_code=status_code,
        content={"detail": exc.message},
        headers=headers,
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


@app.get("/health", tags=["General"], summary="Legacy health check alias")
async def health_check():
    return {"status": "ok"}


@app.get("/health/live", tags=["General"], summary="Liveness probe for process and event loop responsiveness")
async def liveness_check():
    """
    Shallow probe: returns 200 OK immediately if the web process is running
    and the async event loop is alive.
    """
    return {"status": "alive"}


@app.get(
    "/health/ready",
    tags=["General"],
    summary="Readiness probe for database connection and dependency availability",
)
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """
    Deep probe: verifies that the PostgreSQL connection pool is healthy
    and accepting queries. Returns 503 if unreachable or timed out.
    """
    try:
        await db.execute(text("SELECT 1"), execution_options={"timeout": 2.0})
        return {"status": "ready", "database": "connected"}
    except Exception as exc:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "not_ready", "database": "disconnected", "detail": str(exc)},
        )
