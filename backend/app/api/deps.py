from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
import jwt
from app.config import settings
from app.database import get_db
from app.domain.enums import MatchUserRole
from app.models.user import User
from app.repositories.delivery import DeliveryRepository
from app.repositories.innings import InningsRepository
from app.repositories.match import MatchRepository
from app.repositories.match_access import MatchAccessRepository
from app.repositories.player import PlayerRepository
from app.repositories.squad import SquadRepository
from app.repositories.team import TeamRepository
from app.repositories.user import UserRepository
from app.services.auth import AuthService
from app.services.delivery import DeliveryService
from app.services.innings import InningsService
from app.services.match import MatchService
from app.services.match_access import MatchAccessService
from app.services.player import PlayerService
from app.services.scorecard import ScorecardService
from app.services.security import decode_token
from app.services.squad import SquadService
from app.services.team import TeamService

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_PREFIX}/auth/login",
    auto_error=False,
)


async def get_team_service(session: AsyncSession = Depends(get_db)) -> TeamService:
    team_repo = TeamRepository(session)
    return TeamService(team_repo)


async def get_player_service(session: AsyncSession = Depends(get_db)) -> PlayerService:
    player_repo = PlayerRepository(session)
    return PlayerService(player_repo)


async def get_match_service(session: AsyncSession = Depends(get_db)) -> MatchService:
    match_repo = MatchRepository(session)
    team_repo = TeamRepository(session)
    squad_repo = SquadRepository(session)
    innings_repo = InningsRepository(session)
    match_access_repo = MatchAccessRepository(session)
    return MatchService(match_repo, team_repo, squad_repo, innings_repo, match_access_repo)


async def get_squad_service(session: AsyncSession = Depends(get_db)) -> SquadService:
    squad_repo = SquadRepository(session)
    match_repo = MatchRepository(session)
    return SquadService(squad_repo, match_repo)


async def get_innings_service(session: AsyncSession = Depends(get_db)) -> InningsService:
    innings_repo = InningsRepository(session)
    match_repo = MatchRepository(session)
    delivery_repo = DeliveryRepository(session)
    squad_repo = SquadRepository(session)
    return InningsService(innings_repo, match_repo, delivery_repo, squad_repo)


async def get_delivery_service(session: AsyncSession = Depends(get_db)) -> DeliveryService:
    delivery_repo = DeliveryRepository(session)
    innings_repo = InningsRepository(session)
    match_repo = MatchRepository(session)
    squad_repo = SquadRepository(session)
    return DeliveryService(delivery_repo, innings_repo, match_repo, squad_repo)


async def get_scorecard_service(session: AsyncSession = Depends(get_db)) -> ScorecardService:
    match_repo = MatchRepository(session)
    innings_repo = InningsRepository(session)
    delivery_repo = DeliveryRepository(session)
    player_repo = PlayerRepository(session)
    team_repo = TeamRepository(session)
    return ScorecardService(match_repo, innings_repo, delivery_repo, player_repo, team_repo)


async def get_user_repo(session: AsyncSession = Depends(get_db)) -> UserRepository:
    return UserRepository(session)


async def get_match_access_repo(session: AsyncSession = Depends(get_db)) -> MatchAccessRepository:
    return MatchAccessRepository(session)


async def get_auth_service(user_repo: UserRepository = Depends(get_user_repo)) -> AuthService:
    return AuthService(user_repo)


async def get_match_access_service(
    match_access_repo: MatchAccessRepository = Depends(get_match_access_repo),
    match_service: MatchService = Depends(get_match_service),
    user_repo: UserRepository = Depends(get_user_repo),
) -> MatchAccessService:
    return MatchAccessService(match_access_repo, match_service.match_repo, user_repo)


async def get_current_user_optional(
    token: str | None = Depends(oauth2_scheme),
    user_repo: UserRepository = Depends(get_user_repo),
) -> User | None:
    if not token:
        return None
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            return None
        user_id = int(payload.get("sub", 0))
    except (jwt.PyJWTError, ValueError):
        return None

    user = await user_repo.get_by_id(user_id)
    if not user or not user.is_active:
        return None
    return user


async def get_current_user(
    current_user: User | None = Depends(get_current_user_optional),
) -> User:
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided or are invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user


def require_match_access(allowed_roles: list[MatchUserRole] | None = None):
    """
    Dependency factory to check whether the current user is authorized to perform operations on a match.
    Allows:
    1. Superusers.
    2. Legacy/unassigned matches (where match.created_by is None and no access entries exist),
       preserving compatibility with historical fixtures and test seeds.
    3. Users with explicit matching role or OWNER role (OWNER can perform all SCORER actions).
    """
    if allowed_roles is None:
        allowed_roles = [MatchUserRole.OWNER, MatchUserRole.SCORER]

    async def _guard(
        request: Request,
        match_service: MatchService = Depends(get_match_service),
        match_access_service: MatchAccessService = Depends(get_match_access_service),
        current_user: User | None = Depends(get_current_user_optional),
    ) -> User | None:
        match_id_str = request.path_params.get("id") or request.path_params.get("match_id")
        if not match_id_str:
            return current_user

        try:
            match_id = int(match_id_str)
        except ValueError:
            return current_user

        match = await match_service.match_repo.get_by_id(match_id)
        if not match:
            # Let the endpoint itself return 404
            return current_user

        records = await match_access_service.match_access_repo.list_for_match(match_id)

        # Legacy / unassigned match compatibility:
        if getattr(match, "created_by", None) is None and not records:
            return current_user

        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required for this match",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if getattr(current_user, "is_superuser", False) or getattr(match, "created_by", None) == current_user.id:
            return current_user

        user_role = await match_access_service.match_access_repo.get_user_match_role(match_id, current_user.id)
        if not user_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to modify this match",
            )

        if user_role == MatchUserRole.OWNER or user_role in allowed_roles:
            return current_user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have the required role for this match",
        )

    return _guard
