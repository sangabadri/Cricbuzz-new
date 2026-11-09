from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from app.domain.enums import MatchUserRole


class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$")
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool
    is_superuser: bool
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class MatchAccessGrant(BaseModel):
    username: str
    role: MatchUserRole = MatchUserRole.SCORER


class MatchAccessResponse(BaseModel):
    user_id: int
    username: str
    role: MatchUserRole
    granted_by: int | None = None
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
