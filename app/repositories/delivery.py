from typing import Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.delivery import Delivery


class DeliveryRepository:
    """
    Handles all direct database queries for Deliveries.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(
        self,
        innings_id: int,
        delivery_data: dict[str, Any] | Any,
    ) -> Delivery:
        """Inserts a new delivery into the database."""
        get = (
            delivery_data.get
            if isinstance(delivery_data, dict)
            else lambda k, default=None: getattr(delivery_data, k, default)
        )
        delivery = Delivery(
            innings_id=innings_id,
            over=get("over"),
            ball=get("ball"),
            bowler_id=get("bowler_id"),
            batsman_id=get("batsman_id"),
            non_striker_id=get("non_striker_id"),
            runs=get("runs", 0),
            extra_type=get("extra_type"),
            extras=get("extras", 0),
            wicket_type=get("wicket_type"),
            player_out_id=get("player_out_id"),
            fielder_id=get("fielder_id"),
            commentary=get("commentary"),
        )
        self.session.add(delivery)
        await self.session.flush()
        await self.session.refresh(delivery)
        return delivery

    async def list_by_innings(self, innings_id: int) -> list[Delivery]:
        """Lists all deliveries in an innings in chronological order."""
        query = (
            select(Delivery)
            .where(Delivery.innings_id == innings_id)
            .order_by(Delivery.over.asc(), Delivery.ball.asc(), Delivery.id.asc())
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_last_delivery(self, innings_id: int) -> Delivery | None:
        """Finds the most recently recorded delivery in an innings."""
        query = (
            select(Delivery)
            .where(Delivery.innings_id == innings_id)
            .order_by(Delivery.over.desc(), Delivery.ball.desc(), Delivery.id.desc())
            .limit(1)
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def delete(self, delivery: Delivery) -> None:
        """Deletes a delivery (e.g. for undo)."""
        await self.session.delete(delivery)
        await self.session.flush()

    async def save(self, delivery: Delivery) -> Delivery:
        """Flushes and refreshes an updated delivery."""
        await self.session.flush()
        await self.session.refresh(delivery)
        return delivery
