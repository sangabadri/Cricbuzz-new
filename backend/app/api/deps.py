from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
import jwt
from app.config import settings
from app.database import get_db
from app.domain.enums import MatchUserRole
from app.domain.exceptions import AccessDeniedError, AuthenticationRequiredError, EntityNotFoundError
from app.models.user import User
from app.repositories.delivery import DeliveryRepository
from app.repositories.innings import InningsRepository
from app.repositories.match import MatchRepository
from app.repositories.match_access import MatchAccessRepository
from app.repositories.player import PlayerRepository
from app.repositories.squad import SquadRepository
from app.repositories.team import TeamRepository
from app.repositories.user import UserRepository
from app.repositories.refresh_token import RefreshTokenRepository
from app.services.auth import AuthService
from app.services.delivery import DeliveryService
from app.services.demo_seed import DemoSeedService
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


async def get_team_repo(session: AsyncSession = Depends(get_db)) -> TeamRepository:
    return TeamRepository(session)


async def get_player_repo(session: AsyncSession = Depends(get_db)) -> PlayerRepository:
    return PlayerRepository(session)


async def get_match_repo(session: AsyncSession = Depends(get_db)) -> MatchRepository:
    return MatchRepository(session)


async def get_squad_repo(session: AsyncSession = Depends(get_db)) -> SquadRepository:
    return SquadRepository(session)


async def get_innings_repo(session: AsyncSession = Depends(get_db)) -> InningsRepository:
    return InningsRepository(session)


async def get_delivery_repo(session: AsyncSession = Depends(get_db)) -> DeliveryRepository:
    return DeliveryRepository(session)


async def get_user_repo(session: AsyncSession = Depends(get_db)) -> UserRepository:
    return UserRepository(session)


async def get_refresh_token_repo(session: AsyncSession = Depends(get_db)) -> RefreshTokenRepository:
    return RefreshTokenRepository(session)


async def get_match_access_repo(session: AsyncSession = Depends(get_db)) -> MatchAccessRepository:
    return MatchAccessRepository(session)


async def get_team_service(
    team_repo: TeamRepository = Depends(get_team_repo),
) -> TeamService:
    return TeamService(team_repo)


async def get_player_service(
    player_repo: PlayerRepository = Depends(get_player_repo),
) -> PlayerService:
    return PlayerService(player_repo)


async def get_match_service(
    match_repo: MatchRepository = Depends(get_match_repo),
    team_repo: TeamRepository = Depends(get_team_repo),
    squad_repo: SquadRepository = Depends(get_squad_repo),
    innings_repo: InningsRepository = Depends(get_innings_repo),
    match_access_repo: MatchAccessRepository = Depends(get_match_access_repo),
) -> MatchService:
    return MatchService(match_repo, team_repo, squad_repo, innings_repo, match_access_repo)


async def get_squad_service(
    squad_repo: SquadRepository = Depends(get_squad_repo),
    match_repo: MatchRepository = Depends(get_match_repo),
    player_repo: PlayerRepository = Depends(get_player_repo),
) -> SquadService:
    return SquadService(squad_repo, match_repo, player_repo)


async def get_innings_service(
    innings_repo: InningsRepository = Depends(get_innings_repo),
    match_repo: MatchRepository = Depends(get_match_repo),
    delivery_repo: DeliveryRepository = Depends(get_delivery_repo),
    squad_repo: SquadRepository = Depends(get_squad_repo),
) -> InningsService:
    return InningsService(innings_repo, match_repo, delivery_repo, squad_repo)


async def get_demo_seed_service(
    team_svc: TeamService = Depends(get_team_service),
    player_svc: PlayerService = Depends(get_player_service),
    match_svc: MatchService = Depends(get_match_service),
    squad_svc: SquadService = Depends(get_squad_service),
    inn_svc: InningsService = Depends(get_innings_service),
) -> DemoSeedService:
    return DemoSeedService(team_svc, player_svc, match_svc, squad_svc, inn_svc)


async def get_delivery_service(
    delivery_repo: DeliveryRepository = Depends(get_delivery_repo),
    innings_repo: InningsRepository = Depends(get_innings_repo),
    match_repo: MatchRepository = Depends(get_match_repo),
    squad_repo: SquadRepository = Depends(get_squad_repo),
) -> DeliveryService:
    return DeliveryService(delivery_repo, innings_repo, match_repo, squad_repo)


async def get_scorecard_service(
    match_repo: MatchRepository = Depends(get_match_repo),
    innings_repo: InningsRepository = Depends(get_innings_repo),
    delivery_repo: DeliveryRepository = Depends(get_delivery_repo),
    player_repo: PlayerRepository = Depends(get_player_repo),
    team_repo: TeamRepository = Depends(get_team_repo),
) -> ScorecardService:
    return ScorecardService(match_repo, innings_repo, delivery_repo, player_repo, team_repo)


async def get_auth_service(
    user_repo: UserRepository = Depends(get_user_repo),
    refresh_token_repo: RefreshTokenRepository = Depends(get_refresh_token_repo),
) -> AuthService:
    return AuthService(user_repo, refresh_token_repo)


async def get_match_access_service(
    match_access_repo: MatchAccessRepository = Depends(get_match_access_repo),
    match_repo: MatchRepository = Depends(get_match_repo),
    user_repo: UserRepository = Depends(get_user_repo),
) -> MatchAccessService:
    return MatchAccessService(match_access_repo, match_repo, user_repo)


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
    Enforces authorization via MatchAccessService.authorize_match_access.
    """
    if allowed_roles is None:
        allowed_roles = [MatchUserRole.OWNER, MatchUserRole.SCORER]

    async def _guard(
        request: Request,
        match_access_service: MatchAccessService = Depends(get_match_access_service),
        current_user: User | None = Depends(get_current_user_optional),
    ) -> User | None:
        match_id_str = request.path_params.get("match_id") or request.path_params.get("id")
        if not match_id_str:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing match ID parameter in request path",
            )

        try:
            match_id = int(match_id_str)
            if match_id <= 0:
                raise ValueError()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid match ID parameter in request path",
            )

        try:
            return await match_access_service.authorize_match_access(
                match_id=match_id,
                user=current_user,
                allowed_roles=allowed_roles,
            )
        except AuthenticationRequiredError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=exc.message,
                headers={"WWW-Authenticate": "Bearer"},
            )
        except AccessDeniedError as exc:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=exc.message,
            )
        except EntityNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=exc.message,
            )

    return _guard
