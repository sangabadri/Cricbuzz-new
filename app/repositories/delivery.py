from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.delivery import Delivery
from app.schemas.delivery import DeliveryCreate


class DeliveryRepository:
    """
    Handles all direct database queries for Deliveries.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_next_delivery_index(self, innings_id: int) -> int:
        """Determines the next sequential delivery index for an innings."""
        query = select(func.coalesce(func.max(Delivery.delivery_index), 0)).where(
            Delivery.innings_id == innings_id
        )
        result = await self.session.execute(query)
        return int(result.scalar_one()) + 1

    async def create(
        self,
        innings_id: int,
        delivery_in: DeliveryCreate,
        delivery_index: int | None = None,
    ) -> Delivery:
        """Inserts a new delivery into the database."""
        if delivery_index is None:
            delivery_index = await self.get_next_delivery_index(innings_id)

        delivery = Delivery(
            innings_id=innings_id,
            delivery_index=delivery_index,
            over=delivery_in.over,
            ball=delivery_in.ball,
            bowler_id=delivery_in.bowler_id,
            batsman_id=delivery_in.batsman_id,
            non_striker_id=delivery_in.non_striker_id,
            runs=delivery_in.runs,
            extra_type=delivery_in.extra_type,
            extras=delivery_in.extras,
            wicket_type=delivery_in.wicket_type,
            player_out_id=delivery_in.player_out_id,
            fielder_id=delivery_in.fielder_id,
            new_batter_id=getattr(delivery_in, "new_batter_id", None),
            commentary=delivery_in.commentary,
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
            .order_by(Delivery.delivery_index.asc(), Delivery.id.asc())
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_last_delivery(self, innings_id: int) -> Delivery | None:
        """Finds the most recently recorded delivery in an innings."""
        query = (
            select(Delivery)
            .where(Delivery.innings_id == innings_id)
            .order_by(Delivery.delivery_index.desc(), Delivery.id.desc())
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
