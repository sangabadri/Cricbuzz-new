from sqlalchemy import Column, String, Integer, DateTime, JSON, ForeignKey, func, Index
from app.models.base import Base


class IdempotencyRecord(Base):
    """
    Persists API mutation idempotency records.
    Allows safe retries without duplicate deliveries or state corruption.
    """
    __tablename__ = "idempotency_records"

    endpoint = Column(String(255), primary_key=True)
    key = Column(String(128), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    status_code = Column(Integer, nullable=False, default=201)
    response_body = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        Index("idx_idempotency_created_at", "created_at"),
    )
