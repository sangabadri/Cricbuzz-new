from pydantic import BaseModel, ConfigDict, Field
from app.schemas.enums import ExtraType, WicketType


class DeliveryCreate(BaseModel):
    """Schema for recording or updating a ball with explicit player positions and over/ball."""
    over: int = Field(..., ge=0, description="Over number (0-indexed)")
    ball: int = Field(..., ge=1, description="Ball number within the over")
    bowler_id: int = Field(..., description="Player ID of the bowler")
    batsman_id: int = Field(..., description="Player ID of the striker")
    non_striker_id: int = Field(..., description="Player ID of the non-striker")
    runs: int = Field(default=0, ge=0, le=6, description="Runs scored off the bat (0-6)")
    extra_type: ExtraType | None = Field(default=None, description="wide, noball, bye, leg-bye")
    extras: int = Field(default=0, ge=0, description="Extra runs conceded")
    wicket_type: WicketType | None = Field(default=None, description="Dismissal type if wicket fell")
    player_out_id: int | None = Field(default=None, description="Player ID dismissed")
    fielder_id: int | None = Field(default=None, description="Player ID of fielder (for catch, runout, etc.)")
    new_batter_id: int | None = Field(default=None, description="Incoming batter ID if a wicket fell")
    commentary: str | None = Field(default=None, description="Ball commentary text")


class BallEventCreate(BaseModel):
    """
    High-level cricket scoring event.
    The domain aggregate automatically determines active striker, non-striker,
    over progression, bowler quota, and strike rotation.
    """
    bowler_id: int = Field(..., description="Player ID of the bowler bowling this delivery")
    runs: int = Field(default=0, ge=0, le=6, description="Runs scored off the bat (0-6)")
    extra_type: ExtraType | None = Field(default=None, description="wide, noball, bye, leg-bye")
    extras: int = Field(default=0, ge=0, description="Extra runs conceded")
    wicket_type: WicketType | None = Field(default=None, description="Dismissal type if wicket fell")
    player_out_id: int | None = Field(default=None, description="Player ID dismissed")
    fielder_id: int | None = Field(default=None, description="Player ID of fielder")
    new_batter_id: int | None = Field(default=None, description="Incoming batter ID to replace dismissed player")
    striker_id: int | None = Field(default=None, description="Optional override/setup for striker")
    non_striker_id: int | None = Field(default=None, description="Optional override/setup for non-striker")
    commentary: str | None = Field(default=None, description="Ball commentary text")


class ManualDeliveryUpdate(BaseModel):
    """Schema for correcting or updating an existing delivery."""
    runs: int | None = Field(default=None, ge=0, le=6, description="Updated runs scored off the bat")
    extra_type: ExtraType | None = Field(default=None, description="Updated extra type")
    extras: int | None = Field(default=None, ge=0, description="Updated extra runs")
    wicket_type: WicketType | None = Field(default=None, description="Updated wicket type")
    player_out_id: int | None = Field(default=None, description="Updated player dismissed")
    fielder_id: int | None = Field(default=None, description="Updated fielder")
    new_batter_id: int | None = Field(default=None, description="Updated incoming batter")
    commentary: str | None = Field(default=None, description="Updated commentary text")


class DeliveryResponse(DeliveryCreate):
    """Schema for returning delivery information."""
    id: int
    innings_id: int
    delivery_index: int = 1

    model_config = ConfigDict(from_attributes=True)
