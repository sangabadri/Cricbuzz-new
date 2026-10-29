from sqlalchemy import Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class Squad(Base):
    """
    SQLAlchemy Model for the 'squads' table.
    Represents a team's submitted squad for a specific match.
    """
    __tablename__ = "squads"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), nullable=False)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), nullable=False)
    captain_id: Mapped[int] = mapped_column(ForeignKey("players.id"), nullable=False)
    wicket_keeper_id: Mapped[int] = mapped_column(ForeignKey("players.id"), nullable=False)

    # Relationship to players in this squad
    players: Mapped[list["SquadPlayer"]] = relationship(
        back_populates="squad",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint("match_id", "team_id", name="unique_match_team_squad"),
    )


class SquadPlayer(Base):
    """
    SQLAlchemy Model for the 'squad_players' table.
    Links players to a squad and marks who is in the Playing XI.
    """
    __tablename__ = "squad_players"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    squad_id: Mapped[int] = mapped_column(ForeignKey("squads.id"), nullable=False)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), nullable=False)
    is_playing_xi: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    squad: Mapped["Squad"] = relationship(back_populates="players")

    __table_args__ = (
        UniqueConstraint("squad_id", "player_id", name="unique_squad_player"),
    )
