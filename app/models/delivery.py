from sqlalchemy import Column, Integer, String, ForeignKey, Enum, CheckConstraint, UniqueConstraint
from app.models.base import Base
from app.domain.enums import ExtraType, WicketType


class Delivery(Base):
    __tablename__ = "deliveries"
    
    id = Column(Integer, primary_key=True)
    innings_id = Column(Integer, ForeignKey("innings.id"), nullable=False)
    over = Column(Integer, nullable=False)
    ball = Column(Integer, nullable=False)
    bowler_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    batsman_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    non_striker_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    runs = Column(Integer, nullable=False, default=0)
    extra_type = Column(Enum(ExtraType), nullable=True)
    extras = Column(Integer, nullable=False, default=0)
    wicket_type = Column(Enum(WicketType), nullable=True)
    player_out_id = Column(Integer, ForeignKey("players.id"), nullable=True)
    fielder_id = Column(Integer, ForeignKey("players.id"), nullable=True)
    commentary = Column(String, nullable=True)

    __table_args__ = (
        CheckConstraint("runs >= 0", name="valid_runs_range"),
        CheckConstraint("extras >= 0", name="valid_extras_range"),
        CheckConstraint("over >= 0", name="valid_over_number"),
        CheckConstraint("ball >= 1", name="valid_ball_number"),
        CheckConstraint("batsman_id != non_striker_id", name="batsman_and_non_striker_must_differ"),
        CheckConstraint("batsman_id != bowler_id", name="batsman_and_bowler_must_differ"),
        UniqueConstraint("innings_id", "over", "ball", name="unique_ball_in_over"),
    )
