from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base
from app.schemas.enums import MatchFormat, MatchStatus, TossDecision

if TYPE_CHECKING:
    from app.models.innings import Innings
    from app.models.player import Player
    from app.models.team import Team


class Match(Base):
    """
    SQLAlchemy Model for the 'matches' table.
    """
    __tablename__ = "matches"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    team_a: Mapped[int] = mapped_column(ForeignKey("teams.id"), nullable=False)
    team_b: Mapped[int] = mapped_column(ForeignKey("teams.id"), nullable=False)
    venue: Mapped[str] = mapped_column(String(100), nullable=False)
    format: Mapped[MatchFormat] = mapped_column(Enum(MatchFormat), nullable=False)
    status: Mapped[MatchStatus] = mapped_column(
        Enum(MatchStatus),
        nullable=False,
        default=MatchStatus.SCHEDULED,
    )
    match_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Toss results (filled after toss is conducted)
    toss_winner: Mapped[int | None] = mapped_column(ForeignKey("teams.id"), nullable=True, default=None)
    toss_decision: Mapped[TossDecision | None] = mapped_column(Enum(TossDecision), nullable=True, default=None)

    # Post-match results
    winner: Mapped[int | None] = mapped_column(ForeignKey("teams.id"), nullable=True, default=None)
    mom: Mapped[int | None] = mapped_column(ForeignKey("players.id"), nullable=True, default=None)

    # Relationships
    team_a_rel: Mapped["Team"] = relationship("Team", foreign_keys=[team_a], lazy="selectin")
    team_b_rel: Mapped["Team"] = relationship("Team", foreign_keys=[team_b], lazy="selectin")
    toss_winner_rel: Mapped["Team | None"] = relationship("Team", foreign_keys=[toss_winner], lazy="selectin")
    winner_rel: Mapped["Team | None"] = relationship("Team", foreign_keys=[winner], lazy="selectin")
    mom_rel: Mapped["Player | None"] = relationship("Player", foreign_keys=[mom], lazy="selectin")
    innings: Mapped[list["Innings"]] = relationship(
        "Innings",
        back_populates="match",
        cascade="all, delete-orphan",
        order_by="Innings.innings_number",
    )

    # Table integrity constraints
    __table_args__ = (
        CheckConstraint("team_a != team_b", name="teams_must_be_different"),
        CheckConstraint(
            "toss_winner IS NULL OR toss_winner = team_a OR toss_winner = team_b",
            name="toss_winner_must_be_match_team",
        ),
        CheckConstraint(
            "winner IS NULL OR winner = team_a OR winner = team_b",
            name="winner_must_be_match_team",
        ),
    )
