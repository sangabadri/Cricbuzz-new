from datetime import datetime, timezone
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
from app.repositories.refresh_token import RefreshTokenRepository
from app.schemas.auth import UserLogin, UserRegister
from app.services.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


class AuthService:
    def __init__(
        self,
        user_repo: UserRepository,
        refresh_token_repo: RefreshTokenRepository | None = None,
    ):
        self.user_repo = user_repo
        self.refresh_token_repo = refresh_token_repo

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
        refresh_token, jti, expires_at = create_refresh_token({"sub": str(user.id)})
        if self.refresh_token_repo:
            await self.refresh_token_repo.create(user_id=user.id, jti=jti, expires_at=expires_at)
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
        refresh_token, jti, expires_at = create_refresh_token({"sub": str(user.id)})
        if self.refresh_token_repo:
            await self.refresh_token_repo.create(user_id=user.id, jti=jti, expires_at=expires_at)
        return user, access_token, refresh_token

    async def refresh_tokens(self, refresh_token: str) -> tuple[User, str, str]:
        try:
            payload = decode_token(refresh_token)
            if payload.get("type") != "refresh":
                raise TokenExpiredOrInvalidError("Invalid token type")
            user_id = int(payload.get("sub", 0))
            jti = payload.get("jti")
            if not jti:
                raise TokenExpiredOrInvalidError("Invalid token: missing jti")
        except (jwt.PyJWTError, ValueError) as err:
            raise TokenExpiredOrInvalidError("Invalid or expired refresh token") from err

        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise EntityNotFoundError(f"User with ID {user_id} not found")
        if not user.is_active:
            raise InactiveUserError("User account is inactive")

        if self.refresh_token_repo:
            stored_token = await self.refresh_token_repo.get_by_jti(jti)
            if not stored_token:
                raise TokenExpiredOrInvalidError("Invalid refresh token")

            # Cryptographic token reuse detection:
            # If the token was already revoked, this is a compromised replay attempt.
            # Invalidate all active sessions for this user immediately!
            if stored_token.revoked_at is not None:
                await self.refresh_token_repo.revoke_all_for_user(user_id)
                raise TokenExpiredOrInvalidError("Refresh token was revoked - reuse detected")

            # Validate expiration against stored expires_at
            token_exp = stored_token.expires_at
            now_utc = datetime.now(timezone.utc)
            if token_exp.tzinfo is None:
                now_utc = now_utc.replace(tzinfo=None)
            if token_exp < now_utc:
                raise TokenExpiredOrInvalidError("Refresh token expired")

            # Atomically revoke current refresh token
            await self.refresh_token_repo.revoke(jti)

        new_access_token = create_access_token({"sub": str(user.id), "username": user.username})
        new_refresh_token, new_jti, new_expires_at = create_refresh_token({"sub": str(user.id)})
        if self.refresh_token_repo:
            await self.refresh_token_repo.create(user_id=user.id, jti=new_jti, expires_at=new_expires_at)

        return user, new_access_token, new_refresh_token

    async def logout(self, refresh_token: str | None = None) -> None:
        if not refresh_token:
            return
        try:
            payload = decode_token(refresh_token)
            jti = payload.get("jti")
            if jti and self.refresh_token_repo:
                await self.refresh_token_repo.revoke(jti)
        except Exception:
            pass

    async def get_user_by_id(self, user_id: int) -> User:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise EntityNotFoundError(f"User with ID {user_id} not found")
        return user
