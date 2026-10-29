from sqlalchemy import CheckConstraint, Enum, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base
from app.schemas.enums import ExtraType, WicketType


class Delivery(Base):
    """
    SQLAlchemy Model for the 'deliveries' table.
    Stores every individual ball bowled in a match innings.
    Uses monotonic delivery_index per innings to support multiple extras (wides/no-balls) in an over.
    """
    __tablename__ = "deliveries"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    innings_id: Mapped[int] = mapped_column(ForeignKey("innings.id"), nullable=False)
    delivery_index: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    over: Mapped[int] = mapped_column(Integer, nullable=False)
    ball: Mapped[int] = mapped_column(Integer, nullable=False)

    # Players involved
    bowler_id: Mapped[int] = mapped_column(ForeignKey("players.id"), nullable=False)
    batsman_id: Mapped[int] = mapped_column(ForeignKey("players.id"), nullable=False)
    non_striker_id: Mapped[int] = mapped_column(ForeignKey("players.id"), nullable=False)

    # Runs & Extras
    runs: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    extra_type: Mapped[ExtraType | None] = mapped_column(Enum(ExtraType), nullable=True, default=None)
    extras: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Dismissal
    wicket_type: Mapped[WicketType | None] = mapped_column(Enum(WicketType), nullable=True, default=None)
    player_out_id: Mapped[int | None] = mapped_column(ForeignKey("players.id"), nullable=True, default=None)
    fielder_id: Mapped[int | None] = mapped_column(ForeignKey("players.id"), nullable=True, default=None)
    new_batter_id: Mapped[int | None] = mapped_column(ForeignKey("players.id"), nullable=True, default=None)

    # Commentary
    commentary: Mapped[str | None] = mapped_column(String, nullable=True, default=None)

    # Relationships
    innings: Mapped["Innings"] = relationship("Innings", back_populates="deliveries")
    bowler: Mapped["Player"] = relationship("Player", foreign_keys=[bowler_id], lazy="selectin")
    batsman: Mapped["Player"] = relationship("Player", foreign_keys=[batsman_id], lazy="selectin")
    non_striker: Mapped["Player"] = relationship("Player", foreign_keys=[non_striker_id], lazy="selectin")
    new_batter: Mapped["Player | None"] = relationship("Player", foreign_keys=[new_batter_id], lazy="selectin")

    __table_args__ = (
        CheckConstraint("runs >= 0 AND runs <= 6", name="valid_runs_range"),
        CheckConstraint("extras >= 0", name="valid_extras_range"),
        CheckConstraint("over >= 0", name="valid_over_number"),
        CheckConstraint("ball >= 1", name="valid_ball_number"),
        CheckConstraint("batsman_id != non_striker_id", name="batsman_and_non_striker_must_differ"),
        CheckConstraint("batsman_id != bowler_id", name="batsman_and_bowler_must_differ"),
        UniqueConstraint("innings_id", "delivery_index", name="unique_delivery_in_innings"),
    )
