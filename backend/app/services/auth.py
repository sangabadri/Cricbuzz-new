import jwt
from app.domain.exceptions import (
    EntityConflictError,
    EntityNotFoundError,
    InactiveUserError,
    InvalidCredentialsError,
    TokenExpiredOrInvalidError,
)
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.auth import UserLogin, UserRegister
from app.services.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


class AuthService:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    async def register(self, user_in: UserRegister) -> tuple[User, str, str]:
        # Validate unique username
        existing_username = await self.user_repo.get_by_username(user_in.username)
        if existing_username:
            raise EntityConflictError(f"Username '{user_in.username}' is already taken")

        # Validate unique email
        existing_email = await self.user_repo.get_by_email(user_in.email)
        if existing_email:
            raise EntityConflictError(f"Email '{user_in.email}' is already registered")

        # Hash password and create user
        pw_hash = hash_password(user_in.password)
        user = await self.user_repo.create(
            username=user_in.username,
            email=user_in.email,
            password_hash=pw_hash,
        )

        access_token = create_access_token({"sub": str(user.id), "username": user.username})
        refresh_token = create_refresh_token({"sub": str(user.id)})
        return user, access_token, refresh_token

    async def login(self, login_in: UserLogin) -> tuple[User, str, str]:
        user = await self.user_repo.get_by_username(login_in.username)
        if not user:
            raise InvalidCredentialsError("Invalid username or password")

        if not verify_password(login_in.password, user.password_hash):
            raise InvalidCredentialsError("Invalid username or password")

        if not user.is_active:
            raise InactiveUserError("User account is inactive")

        access_token = create_access_token({"sub": str(user.id), "username": user.username})
        refresh_token = create_refresh_token({"sub": str(user.id)})
        return user, access_token, refresh_token

    async def refresh_tokens(self, refresh_token: str) -> tuple[User, str, str]:
        try:
            payload = decode_token(refresh_token)
            if payload.get("type") != "refresh":
                raise TokenExpiredOrInvalidError("Invalid token type")
            user_id = int(payload.get("sub", 0))
        except (jwt.PyJWTError, ValueError) as err:
            raise TokenExpiredOrInvalidError("Invalid or expired refresh token") from err

        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise EntityNotFoundError(f"User with ID {user_id} not found")
        if not user.is_active:
            raise InactiveUserError("User account is inactive")

        new_access_token = create_access_token({"sub": str(user.id), "username": user.username})
        new_refresh_token = create_refresh_token({"sub": str(user.id)})
        return user, new_access_token, new_refresh_token

    async def get_user_by_id(self, user_id: int) -> User:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise EntityNotFoundError(f"User with ID {user_id} not found")
        return user
