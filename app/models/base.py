from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """
    SQLAlchemy 2.0 DeclarativeBase.
    All ORM database models will inherit from this base class.
    """
    pass
