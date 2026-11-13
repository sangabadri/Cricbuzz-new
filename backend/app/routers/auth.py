from fastapi import APIRouter, Depends, Request, Response, status
from app.api.deps import get_auth_service, get_current_user
from app.domain.exceptions import TokenExpiredOrInvalidError
from app.models.user import User
from app.schemas.auth import RefreshTokenRequest, TokenResponse, UserLogin, UserRegister, UserResponse
from app.services.auth import AuthService
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])


def set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        httponly=True,
        samesite=settings.COOKIE_SAMESITE,
        secure=settings.COOKIE_SECURE,
        path=f"{settings.API_V1_PREFIX}/auth",
    )


def clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        httponly=True,
        samesite=settings.COOKIE_SAMESITE,
        secure=settings.COOKIE_SECURE,
        path=f"{settings.API_V1_PREFIX}/auth",
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: UserRegister,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Registers a new user, sets httpOnly refresh token cookie,
    and returns user info with access and refresh tokens.
    """
    user, access_token, refresh_token = await auth_service.register(user_in)
    set_refresh_cookie(response, refresh_token)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    login_in: UserLogin,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Authenticates a user, sets httpOnly refresh token cookie,
    and returns user info with access and refresh tokens.
    """
    user, access_token, refresh_token = await auth_service.login(login_in)
    set_refresh_cookie(response, refresh_token)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: Request,
    response: Response,
    refresh_in: RefreshTokenRequest | None = None,
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Refreshes an expired access token using a valid refresh token.
    Extracts the token from httpOnly cookie or JSON request body.
    Rotates the refresh token on each request and updates cookie.
    """
    token = request.cookies.get(settings.REFRESH_COOKIE_NAME)
    if not token and refresh_in and refresh_in.refresh_token:
        token = refresh_in.refresh_token

    if not token:
        raise TokenExpiredOrInvalidError("Refresh token missing from cookie and request body")

    user, access_token, new_refresh_token = await auth_service.refresh_tokens(token)
    set_refresh_cookie(response, new_refresh_token)
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
    request: Request,
    response: Response,
    logout_in: RefreshTokenRequest | None = None,
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Logs out the user by revoking the active refresh token session
    in the database and clearing the httpOnly refresh token cookie.
    """
    token = request.cookies.get(settings.REFRESH_COOKIE_NAME)
    if not token and logout_in and logout_in.refresh_token:
        token = logout_in.refresh_token

    if token:
        await auth_service.logout(token)

    clear_refresh_cookie(response)
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
):
    """
    Returns the currently authenticated user's profile.
    """
    return UserResponse.model_validate(current_user)
