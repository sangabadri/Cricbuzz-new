from sqlalchemy import Enum, String
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base
from app.schemas.enums import BattingStyle, BowlingStyle, Role


class Player(Base):
    """
    SQLAlchemy Model for the 'players' table.
    """
    __tablename__ = "players"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[Role] = mapped_column(Enum(Role), nullable=False)
    batting: Mapped[BattingStyle] = mapped_column(Enum(BattingStyle), nullable=False)
    bowling: Mapped[BowlingStyle | None] = mapped_column(
        Enum(BowlingStyle),
        nullable=True,
        default=None,
    )
