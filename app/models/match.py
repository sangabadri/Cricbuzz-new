from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey, CheckConstraint
from app.models.base import Base
from app.domain.enums import MatchFormat, TossDecision, MatchStatus


class Match(Base):
    __tablename__ = "matches"
    
    id = Column(Integer, primary_key=True)
    team_a = Column(Integer, ForeignKey("teams.id"), nullable=False)
    team_b = Column(Integer, ForeignKey("teams.id"), nullable=False)
    venue = Column(String, nullable=False)
    format = Column(Enum(MatchFormat), nullable=False)
    status = Column(Enum(MatchStatus), nullable=False)
    match_date = Column(DateTime(timezone=True), nullable=False)
    mom = Column(Integer, ForeignKey("players.id"), nullable=True)
    winner = Column(Integer, ForeignKey("teams.id"), nullable=True)
    toss_winner = Column(Integer, ForeignKey("teams.id"), nullable=True)
    toss_decision = Column(Enum(TossDecision), nullable=True)
    
    win_margin_runs = Column(Integer, nullable=True)
    win_margin_wickets = Column(Integer, nullable=True)
    
    __table_args__ = (
        CheckConstraint(
            "team_a != team_b",
            name="teams_must_be_different"
        ),
        CheckConstraint(
            "winner IS NULL OR winner = team_a OR winner = team_b",
            name="winner_must_be_match_team"
        ),
        CheckConstraint(
            "toss_winner IS NULL OR toss_winner = team_a OR toss_winner = team_b",
            name="toss_winner_must_be_match_team"
        ),
    )
