from pydantic import BaseModel, ConfigDict, Field


class TeamCreate(BaseModel):
    """
    Schema for creating a new team (incoming request body).
    """
    name: str = Field(..., min_length=2, max_length=100, description="Team name, e.g. India")


class TeamResponse(BaseModel):
    """
    Schema for returning team data (outgoing API response).
    """
    id: int
    name: str

    # Tells Pydantic to automatically convert a SQLAlchemy model into this schema
    model_config = ConfigDict(from_attributes=True)
