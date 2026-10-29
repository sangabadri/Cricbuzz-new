from sqlalchemy import CheckConstraint, Enum, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.domain.enums import InningsStatus
from app.models.base import Base


class Innings(Base):
    """
    SQLAlchemy Model for the 'innings' table.
    Tracks an individual innings of a match.
    """
    __tablename__ = "innings"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), nullable=False)
    innings_number: Mapped[int] = mapped_column(Integer, nullable=False)
    batting_team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), nullable=False)
    bowling_team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), nullable=False)
    status: Mapped[InningsStatus] = mapped_column(
        Enum(InningsStatus),
        nullable=False,
        default=InningsStatus.NOT_STARTED,
    )
    target: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)

    # Relationships
    match: Mapped["Match"] = relationship("Match", back_populates="innings")
    batting_team: Mapped["Team"] = relationship("Team", foreign_keys=[batting_team_id], lazy="selectin")
    bowling_team: Mapped["Team"] = relationship("Team", foreign_keys=[bowling_team_id], lazy="selectin")
    deliveries: Mapped[list["Delivery"]] = relationship(
        "Delivery",
        back_populates="innings",
        cascade="all, delete-orphan",
        order_by="Delivery.delivery_index",
    )

    __table_args__ = (
        CheckConstraint(
            "batting_team_id != bowling_team_id",
            name="batting_and_bowling_teams_must_be_different",
        ),
        CheckConstraint(
            "innings_number >= 1 AND innings_number <= 2",
            name="valid_innings_number",
        ),
        UniqueConstraint(
            "match_id", "innings_number",
            name="unique_match_innings",
        ),
    )
