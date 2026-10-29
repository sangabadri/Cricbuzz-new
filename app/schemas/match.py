from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.enums import MatchFormat, MatchStatus, TossDecision


class MatchCreate(BaseModel):
    """Schema for scheduling a new match."""
    team_a: int = Field(..., description="ID of Team A")
    team_b: int = Field(..., description="ID of Team B")
    venue: str = Field(..., min_length=2, max_length=100, description="Stadium or venue name")
    format: MatchFormat = Field(..., description="Match format (t20, odi)")
    match_date: datetime = Field(..., description="Scheduled date and time of the match")


class MatchToss(BaseModel):
    """Schema for conducting the toss."""
    toss_winner: int = Field(..., description="Team ID that won the toss")
    toss_decision: TossDecision = Field(..., description="Decision: bat or bowl")


class MatchMOM(BaseModel):
    """Schema for awarding Man of the Match."""
    player_id: int = Field(..., description="Player ID awarded Man of the Match")


class MatchResponse(MatchCreate):
    """Schema for returning match details."""
    id: int
    status: MatchStatus
    toss_winner: int | None = None
    toss_decision: TossDecision | None = None
    winner: int | None = None
    mom: int | None = None

    model_config = ConfigDict(from_attributes=True)
