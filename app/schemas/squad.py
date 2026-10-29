from pydantic import BaseModel, ConfigDict, Field


class SquadPlayerItem(BaseModel):
    """A player inside a squad."""
    player_id: int
    is_playing_xi: bool = Field(default=True, description="True if player is in the active Playing XI")

    model_config = ConfigDict(from_attributes=True)


class SquadCreate(BaseModel):
    """Schema for submitting a team squad for a match."""
    team_id: int = Field(..., description="ID of the team")
    captain_id: int = Field(..., description="Player ID of the captain")
    wicket_keeper_id: int = Field(..., description="Player ID of the wicketkeeper")
    players: list[SquadPlayerItem] = Field(..., description="List of squad players")


class SquadResponse(SquadCreate):
    """Schema for returning squad details."""
    id: int
    match_id: int

    model_config = ConfigDict(from_attributes=True)
