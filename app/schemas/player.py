from pydantic import BaseModel, ConfigDict, Field
from app.schemas.enums import BattingStyle, BowlingStyle, Role


class PlayerBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Full name of the player")
    role: Role = Field(..., description="Role: batsman, bowler, all-rounder, wicketkeeper")
    batting: BattingStyle = Field(..., description="Batting style")
    bowling: BowlingStyle | None = Field(default=None, description="Bowling style (optional)")


class PlayerCreate(PlayerBase):
    """Schema for creating a player (request body)."""
    pass


class PlayerResponse(PlayerBase):
    """Schema for returning player information (response body)."""
    id: int

    model_config = ConfigDict(from_attributes=True)
