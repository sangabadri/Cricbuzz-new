from typing import Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.idempotency import IdempotencyRecord


class IdempotencyRepository:
    """
    Handles direct persistence and retrieval of idempotency records.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get(self, endpoint: str, key: str) -> IdempotencyRecord | None:
        """Finds an idempotency record by scoped endpoint and key."""
        query = select(IdempotencyRecord).where(
            IdempotencyRecord.endpoint == endpoint,
            IdempotencyRecord.key == key,
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def create(
        self,
        key: str,
        endpoint: str,
        status_code: int,
        response_body: dict[str, Any],
        user_id: int | None = None,
    ) -> IdempotencyRecord:
        """Inserts a new idempotency record into the database."""
        record = IdempotencyRecord(
            key=key,
            user_id=user_id,
            endpoint=endpoint,
            status_code=status_code,
            response_body=response_body,
        )
        self.session.add(record)
        await self.session.flush()
        return record
