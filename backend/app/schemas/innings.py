from pydantic import BaseModel, ConfigDict, Field
from app.domain.enums import InningsStatus


class InningsCreate(BaseModel):
    """
    Schema for initializing an innings.
    All fields are optional and auto-derivable from match and toss context.
    """
    innings_number: int | None = Field(default=None, ge=1, le=4, description="Innings number (1 to 4)")
    batting_team_id: int | None = Field(default=None, description="ID of the batting team")
    bowling_team_id: int | None = Field(default=None, description="ID of the bowling team")
    target: int | None = Field(default=None, ge=1, description="Target runs (for 2nd/4th innings)")


class StartInningsRequest(BaseModel):
    """Schema for starting an innings with openers and opening bowler."""
    striker_id: int = Field(..., description="Opening striker player ID")
    non_striker_id: int = Field(..., description="Opening non-striker player ID")
    bowler_id: int = Field(..., description="Opening bowler player ID")


class InningsResponse(BaseModel):
    """Schema for returning innings details."""
    id: int
    match_id: int
    innings_number: int
    batting_team_id: int
    bowling_team_id: int
    status: InningsStatus
    target: int | None = None
    current_striker_id: int | None = None
    current_non_striker_id: int | None = None
    current_bowler_id: int | None = None

    model_config = ConfigDict(from_attributes=True)
