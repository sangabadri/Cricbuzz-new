from pydantic import BaseModel, ConfigDict, Field, computed_field
from app.domain.enums import ExtraType, InningsStatus, MatchStatus, WicketType


class DeliveryCreate(BaseModel):
    """
    Schema for recording a delivery in the active innings.
    Bowler and crease positions are inherited from the active innings state,
    with optional overrides for initial setup or manual correction.
    """
    runs: int = Field(default=0, ge=0, le=6, description="Runs scored off the bat")
    extra_type: ExtraType | None = Field(default=None, description="wide, noball, bye, leg-bye")
    extras: int = Field(default=0, ge=0, description="Extra runs conceded")
    wicket_type: WicketType | None = Field(default=None, description="Dismissal type if wicket fell")
    player_out_id: int | None = Field(default=None, description="Player ID dismissed")
    fielder_id: int | None = Field(default=None, description="Player ID of fielder")
    commentary: str | None = Field(default=None, description="Ball commentary text")
    # Optional overrides for initial setup / manual correction
    bowler_id: int | None = Field(default=None, description="Optional override for bowler")
    striker_id: int | None = Field(default=None, description="Optional override for striker")
    non_striker_id: int | None = Field(default=None, description="Optional override for non-striker")


class SetBowlerRequest(BaseModel):
    """Schema for selecting the bowler before starting an over."""
    bowler_id: int = Field(..., description="Player ID of the bowler for the upcoming over")


class SetIncomingBatterRequest(BaseModel):
    """Schema for assigning an incoming batter to the crease after a dismissal."""
    player_id: int = Field(..., description="Player ID of the incoming batter")


class ManualDeliveryUpdate(BaseModel):
    """Schema for correcting or updating an existing delivery."""
    runs: int | None = Field(default=None, ge=0, le=6, description="Updated runs scored off the bat")
    extra_type: ExtraType | None = Field(default=None, description="Updated extra type")
    extras: int | None = Field(default=None, ge=0, description="Updated extra runs")
    wicket_type: WicketType | None = Field(default=None, description="Updated wicket type")
    player_out_id: int | None = Field(default=None, description="Updated player dismissed")
    fielder_id: int | None = Field(default=None, description="Updated fielder")
    commentary: str | None = Field(default=None, description="Updated commentary text")


class DeliveryResponse(BaseModel):
    """Schema for returning delivery information."""
    id: int
    innings_id: int
    over: int
    ball: int
    bowler_id: int
    batsman_id: int
    non_striker_id: int
    runs: int = 0
    extra_type: ExtraType | None = None
    extras: int = 0
    wicket_type: WicketType | None = None
    player_out_id: int | None = None
    fielder_id: int | None = None
    commentary: str | None = None

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    def is_legal_ball(self) -> bool:
        return self.extra_type not in (ExtraType.WIDE, ExtraType.NOBALL)


class LiveScorerStateResponse(BaseModel):
    """Full live match state returned to the scorer after any event or action."""
    match_id: int
    innings_number: int
    match_status: MatchStatus
    innings_status: InningsStatus

    # Score metrics
    total_runs: int
    total_wickets: int
    overs_display: str  # e.g. "4.2"
    legal_balls: int
    current_run_rate: float
    target: int | None = None
    runs_needed: int | None = None
    balls_remaining: int | None = None
    required_run_rate: float | None = None

    # Crease state
    striker_id: int | None = None
    non_striker_id: int | None = None
    current_bowler_id: int | None = None
    awaiting_new_batter: bool = False

    # Over progress
    over_completed: bool = False
    current_over_balls: list[str] = Field(default_factory=list)  # e.g. ["1", "Wd", "4", "W"]

    # Flow actions
    next_action: str  # NEXT_BALL, SET_BOWLER, SET_BATTER, INNINGS_BREAK, MATCH_COMPLETED
    eligible_bowler_ids: list[int] = Field(default_factory=list)

    # Match resolution
    match_winner: int | None = None
    win_margin_runs: int | None = None
    win_margin_wickets: int | None = None
