from fastapi import APIRouter, Depends, status
from app.api.deps import get_auth_service, get_current_user
from app.models.user import User
from app.schemas.auth import RefreshTokenRequest, TokenResponse, UserLogin, UserRegister, UserResponse
from app.services.auth import AuthService
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: UserRegister,
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Registers a new user and returns user info with initial access and refresh tokens.
    """
    user, access_token, refresh_token = await auth_service.register(user_in)
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
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Authenticates a user with username and password, returning JWT access and refresh tokens.
    """
    user, access_token, refresh_token = await auth_service.login(login_in)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_in: RefreshTokenRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Refreshes an expired access token using a valid refresh token.
    Rotates the refresh token on each request.
    """
    user, access_token, refresh_token = await auth_service.refresh_tokens(refresh_in.refresh_token)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
):
    """
    Returns the currently authenticated user's profile.
    """
    return UserResponse.model_validate(current_user)
