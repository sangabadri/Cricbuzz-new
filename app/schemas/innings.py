from pydantic import BaseModel, ConfigDict, Field
from app.schemas.enums import InningsStatus


class InningsCreate(BaseModel):
    """Schema for initializing an innings."""
    innings_number: int = Field(..., ge=1, le=2, description="Innings number (1 or 2)")
    batting_team_id: int = Field(..., description="ID of the batting team")
    bowling_team_id: int = Field(..., description="ID of the bowling team")
    target: int | None = Field(default=None, ge=1, description="Target runs (for innings 2)")


class InningsResponse(BaseModel):
    """Schema for returning innings details."""
    id: int
    match_id: int
    innings_number: int
    batting_team_id: int
    bowling_team_id: int
    status: InningsStatus
    target: int | None = None

    model_config = ConfigDict(from_attributes=True)
