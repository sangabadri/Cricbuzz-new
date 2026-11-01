from sqlalchemy import Column, Integer, ForeignKey, Enum, CheckConstraint, UniqueConstraint
from app.models.base import Base
from app.domain.enums import InningsStatus


class Innings(Base):
    __tablename__ = "innings"
    
    id = Column(Integer, primary_key=True)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False)
    innings_number = Column(Integer, nullable=False)
    batting_team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    bowling_team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    status = Column(Enum(InningsStatus), nullable=False, default=InningsStatus.NOT_STARTED)
    target = Column(Integer, nullable=True)

    # Active crease & bowler state
    current_striker_id = Column(Integer, ForeignKey("players.id"), nullable=True)
    current_non_striker_id = Column(Integer, ForeignKey("players.id"), nullable=True)
    current_bowler_id = Column(Integer, ForeignKey("players.id"), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "batting_team_id != bowling_team_id",
            name="batting_and_bowling_teams_must_be_different"
        ),
        CheckConstraint(
            "innings_number >= 1",
            name="valid_innings_number"
        ),
        UniqueConstraint(
            "match_id", "innings_number",
            name="unique_match_innings"
        ),
    )
