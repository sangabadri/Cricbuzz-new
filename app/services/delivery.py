from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.domain.exceptions import (
    CreaseViolationError,
    EntityNotFoundError,
    OverProgressionError,
    RuleViolationError,
)
from app.domain.innings_aggregate import InningsAggregate
from app.domain.rules.formats import get_format_rules
from app.models.delivery import Delivery
from app.repositories.delivery import DeliveryRepository
from app.repositories.innings import InningsRepository
from app.repositories.match import MatchRepository
from app.schemas.delivery import BallEventCreate, DeliveryCreate, ManualDeliveryUpdate
from app.schemas.enums import ExtraType, InningsStatus, MatchStatus, WicketType


def validate_delivery_payload(delivery_in: DeliveryCreate) -> None:
    """
    Validates cricket rules for a single delivery payload.
    Raises pure domain exceptions decoupled from FastAPI.
    """
    # 1. Runs range
    if not (0 <= delivery_in.runs <= 6):
        raise RuleViolationError("Runs must be between 0 and 6")

    # 2. Player distinctness
    if delivery_in.batsman_id == delivery_in.non_striker_id:
        raise CreaseViolationError("Striker and non-striker cannot be the same player")
    if delivery_in.batsman_id == delivery_in.bowler_id:
        raise RuleViolationError("Batsman and bowler cannot be the same player")

    # 3. Extras validation
    if delivery_in.extra_type in (ExtraType.WIDE, ExtraType.NOBALL) and delivery_in.extras < 1:
        raise RuleViolationError(f"Extras must be at least 1 for {delivery_in.extra_type.value}")
    if delivery_in.extra_type is None and delivery_in.extras != 0:
        raise RuleViolationError("Extras must be 0 when extra_type is None")

    # 4. Wicket validation
    if delivery_in.wicket_type is not None:
        if delivery_in.player_out_id is None:
            raise RuleViolationError("player_out_id is required when a wicket occurs")
        if delivery_in.player_out_id not in (delivery_in.batsman_id, delivery_in.non_striker_id):
            raise CreaseViolationError("player_out_id must be either the striker or non-striker")
        if delivery_in.wicket_type == WicketType.CAUGHT:
            if delivery_in.fielder_id is None:
                raise RuleViolationError("fielder_id is required for caught dismissals")
        if delivery_in.wicket_type == WicketType.BOWLED and delivery_in.fielder_id is not None:
            raise RuleViolationError("fielder_id must be None for bowled dismissals")
    else:
        if delivery_in.player_out_id is not None:
            raise RuleViolationError("player_out_id must be None when no wicket occurs")


class DeliveryService:
    """
    Business logic layer for ball-by-ball delivery scoring and match progression.
    Coordinates domain aggregate and repositories.
    """

    def __init__(
        self,
        delivery_repo: DeliveryRepository,
        innings_repo: InningsRepository,
        match_repo: MatchRepository | None = None,
    ):
        self.delivery_repo = delivery_repo
        self.innings_repo = innings_repo
        self.match_repo = match_repo

    async def record_delivery(
        self,
        match_id: int,
        innings_number: int,
        delivery_in: DeliveryCreate | BallEventCreate,
    ) -> Delivery:
        """
        Records a new ball bowled in the innings using InningsAggregate.
        Auto-updates strike rotation, bowler quota, and detects innings transitions.
        """
        innings = await self.innings_repo.get_by_match_and_number(match_id, innings_number)
        if not innings:
            raise EntityNotFoundError(f"Innings {innings_number} for Match {match_id} not found")
        if innings.status == InningsStatus.COMPLETED:
            raise OverProgressionError(f"Innings {innings_number} is already completed")

        match = None
        if self.match_repo:
            match = await self.match_repo.get_by_id(match_id)

        # 1. Load existing deliveries and reconstruct aggregate
        existing_deliveries = await self.delivery_repo.list_by_innings(innings.id)
        match_format = match.format if match else "t20"
        aggregate = InningsAggregate.reconstruct(
            innings_id=innings.id,
            match_id=match_id,
            match_format=match_format,
            target=innings.target,
            deliveries=existing_deliveries,
            status=innings.status,
        )

        # 2. Process ball on aggregate
        if isinstance(delivery_in, DeliveryCreate):
            validate_delivery_payload(delivery_in)
            ball_result = aggregate.record_ball(
                bowler_id=delivery_in.bowler_id,
                runs=delivery_in.runs,
                extra_type=delivery_in.extra_type,
                extras=delivery_in.extras,
                wicket_type=delivery_in.wicket_type,
                player_out_id=delivery_in.player_out_id,
                fielder_id=delivery_in.fielder_id,
                new_batter_id=delivery_in.new_batter_id,
                commentary=delivery_in.commentary,
                explicit_striker_id=delivery_in.batsman_id,
                explicit_non_striker_id=delivery_in.non_striker_id,
            )
            to_save = delivery_in
        else:
            # BallEventCreate
            ball_result = aggregate.record_ball(
                bowler_id=delivery_in.bowler_id,
                runs=delivery_in.runs,
                extra_type=delivery_in.extra_type,
                extras=delivery_in.extras,
                wicket_type=delivery_in.wicket_type,
                player_out_id=delivery_in.player_out_id,
                fielder_id=delivery_in.fielder_id,
                new_batter_id=delivery_in.new_batter_id,
                commentary=delivery_in.commentary,
                explicit_striker_id=delivery_in.striker_id,
                explicit_non_striker_id=delivery_in.non_striker_id,
            )
            to_save = DeliveryCreate(
                over=ball_result["over"],
                ball=ball_result["ball"],
                bowler_id=ball_result["bowler_id"],
                batsman_id=ball_result["batsman_id"],
                non_striker_id=ball_result["non_striker_id"],
                runs=ball_result["runs"],
                extra_type=ball_result["extra_type"],
                extras=ball_result["extras"],
                wicket_type=ball_result["wicket_type"],
                player_out_id=ball_result["player_out_id"],
                fielder_id=ball_result["fielder_id"],
                new_batter_id=ball_result.get("new_batter_id"),
                commentary=ball_result["commentary"],
            )

        # 3. Transition innings to IN_PROGRESS if first ball
        if innings.status == InningsStatus.NOT_STARTED:
            innings.status = InningsStatus.IN_PROGRESS
            await self.innings_repo.save(innings)

        # 4. Save delivery
        created_delivery = await self.delivery_repo.create(
            innings.id,
            to_save,
            delivery_index=ball_result["delivery_index"],
        )

        # 5. Check if innings completed
        if aggregate.is_completed:
            innings.status = InningsStatus.COMPLETED
            await self.innings_repo.save(innings)

            if match and self.match_repo:
                if innings.innings_number == 1:
                    match.status = MatchStatus.INNINGS_BREAK
                elif innings.innings_number == 2:
                    match.status = MatchStatus.COMPLETED
                    if innings.target is not None:
                        if aggregate.total_runs >= innings.target:
                            match.winner = innings.batting_team_id
                        elif aggregate.total_runs < innings.target - 1:
                            match.winner = innings.bowling_team_id
                        else:
                            match.winner = None  # Tied match
                await self.match_repo.save(match)

        return created_delivery

    async def update_last_delivery(
        self,
        match_id: int,
        innings_number: int,
        delivery_in: DeliveryCreate | ManualDeliveryUpdate,
    ) -> Delivery:
        """Modifies the most recently bowled delivery."""
        innings = await self.innings_repo.get_by_match_and_number(match_id, innings_number)
        if not innings:
            raise EntityNotFoundError(f"Innings {innings_number} for Match {match_id} not found")

        last_ball = await self.delivery_repo.get_last_delivery(innings.id)
        if not last_ball:
            raise EntityNotFoundError("No deliveries found to update in this innings")

        if isinstance(delivery_in, DeliveryCreate):
            validate_delivery_payload(delivery_in)
            last_ball.over = delivery_in.over
            last_ball.ball = delivery_in.ball
            last_ball.bowler_id = delivery_in.bowler_id
            last_ball.batsman_id = delivery_in.batsman_id
            last_ball.non_striker_id = delivery_in.non_striker_id
            last_ball.runs = delivery_in.runs
            last_ball.extra_type = delivery_in.extra_type
            last_ball.extras = delivery_in.extras
            last_ball.wicket_type = delivery_in.wicket_type
            last_ball.player_out_id = delivery_in.player_out_id
            last_ball.fielder_id = delivery_in.fielder_id
            last_ball.new_batter_id = delivery_in.new_batter_id
            last_ball.commentary = delivery_in.commentary
        else:
            # ManualDeliveryUpdate
            if delivery_in.runs is not None:
                last_ball.runs = delivery_in.runs
            if delivery_in.extra_type is not None:
                last_ball.extra_type = delivery_in.extra_type
            if delivery_in.extras is not None:
                last_ball.extras = delivery_in.extras
            if delivery_in.wicket_type is not None:
                last_ball.wicket_type = delivery_in.wicket_type
            if delivery_in.player_out_id is not None:
                last_ball.player_out_id = delivery_in.player_out_id
            if delivery_in.fielder_id is not None:
                last_ball.fielder_id = delivery_in.fielder_id
            if delivery_in.new_batter_id is not None:
                last_ball.new_batter_id = delivery_in.new_batter_id
            if delivery_in.commentary is not None:
                last_ball.commentary = delivery_in.commentary

        return await self.delivery_repo.save(last_ball)

    async def undo_last_delivery(self, match_id: int, innings_number: int) -> Delivery:
        """Removes the most recently recorded delivery."""
        innings = await self.innings_repo.get_by_match_and_number(match_id, innings_number)
        if not innings:
            raise EntityNotFoundError(f"Innings {innings_number} for Match {match_id} not found")

        last_ball = await self.delivery_repo.get_last_delivery(innings.id)
        if not last_ball:
            raise EntityNotFoundError("No deliveries found to undo in this innings")

        await self.delivery_repo.delete(last_ball)

        # If innings was marked completed, revert back to in progress
        if innings.status == InningsStatus.COMPLETED:
            innings.status = InningsStatus.IN_PROGRESS
            await self.innings_repo.save(innings)

        if self.match_repo:
            match = await self.match_repo.get_by_id(match_id)
            if match and match.status in (MatchStatus.COMPLETED, MatchStatus.INNINGS_BREAK):
                match.status = MatchStatus.LIVE
                match.winner = None
                await self.match_repo.save(match)

        return last_ball

    async def get_innings_deliveries(self, match_id: int, innings_number: int) -> list[Delivery]:
        """Lists all deliveries for an innings."""
        innings = await self.innings_repo.get_by_match_and_number(match_id, innings_number)
        if not innings:
            raise EntityNotFoundError(f"Innings {innings_number} for Match {match_id} not found")
        return await self.delivery_repo.list_by_innings(innings.id)


async def get_delivery_service(session: AsyncSession = Depends(get_db)) -> DeliveryService:
    """FastAPI dependency for injecting DeliveryService."""
    delivery_repo = DeliveryRepository(session)
    innings_repo = InningsRepository(session)
    match_repo = MatchRepository(session)
    return DeliveryService(delivery_repo, innings_repo, match_repo)
