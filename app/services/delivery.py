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
from app.models.innings import Innings
from app.repositories.delivery import DeliveryRepository
from app.repositories.innings import InningsRepository
from app.repositories.match import MatchRepository
from app.repositories.squad import SquadRepository
from app.schemas.delivery import DeliveryCreate, LiveScorerStateResponse, ManualDeliveryUpdate
from typing import Any
from app.domain.enums import ExtraType, InningsStatus, MatchStatus, WicketType
from app.schemas.innings import InningsCreate


class DeliveryPayload(dict):
    """Payload representing a calculated delivery event, supporting both attribute and dict access."""
    def __getattr__(self, name: str) -> Any:
        try:
            return self[name]
        except KeyError:
            return None

    def __setattr__(self, name: str, value: Any) -> None:
        self[name] = value


def _format_ball_str(d: Any) -> str:
    """Formats a delivery into standard cricket scorer display notation (e.g. '0', '1', 'W', 'Wd', 'Nb')."""
    wicket_type = getattr(d, "wicket_type", None) or (d.get("wicket_type") if isinstance(d, dict) else None)
    extra_type = getattr(d, "extra_type", None) or (d.get("extra_type") if isinstance(d, dict) else None)
    runs = getattr(d, "runs", 0) if not isinstance(d, dict) else d.get("runs", 0)
    extras = getattr(d, "extras", 0) if not isinstance(d, dict) else d.get("extras", 0)

    if wicket_type is not None:
        return "W"
    if extra_type in (ExtraType.WIDE, "wide"):
        return "Wd" if extras <= 1 else f"{extras}Wd"
    if extra_type in (ExtraType.NOBALL, "noball"):
        total = (runs or 0) + (extras or 0)
        return "Nb" if total <= 1 else f"{total}Nb"
    if extra_type in (ExtraType.BYE, "bye"):
        return f"{extras}B"
    if extra_type in (ExtraType.LEGBYE, "leg-bye"):
        return f"{extras}Lb"
    return str(runs or 0)


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
        squad_repo: SquadRepository | None = None,
    ):
        self.delivery_repo = delivery_repo
        self.innings_repo = innings_repo
        self.match_repo = match_repo
        self.squad_repo = squad_repo

    async def record_delivery(
        self,
        match_id: int,
        innings_number: int,
        delivery_in: DeliveryCreate,
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
            if match and match.status == MatchStatus.COMPLETED:
                raise RuleViolationError("Match is already completed")

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
            current_striker_id=innings.current_striker_id,
            current_non_striker_id=innings.current_non_striker_id,
            current_bowler_id=innings.current_bowler_id,
        )

        # 2. Process ball on aggregate
        effective_bowler_id = getattr(delivery_in, "bowler_id", None) or aggregate.current_bowler_id
        if effective_bowler_id is None:
            raise OverProgressionError("No bowler assigned for this over. Set bowler first.")

        effective_striker_id = getattr(delivery_in, "striker_id", None) or aggregate.crease.striker_id
        effective_non_striker_id = getattr(delivery_in, "non_striker_id", None) or aggregate.crease.non_striker_id

        wicket_type = delivery_in.wicket_type
        player_out_id = delivery_in.player_out_id

        if wicket_type is not None:
            if wicket_type == WicketType.RUN_OUT:
                if player_out_id is None:
                    raise RuleViolationError("player_out_id is required for run out dismissals")
            else:
                if player_out_id is None:
                    player_out_id = effective_striker_id
                elif player_out_id != effective_striker_id:
                    raise CreaseViolationError(
                        f"Only the striker ({effective_striker_id}) can be dismissed for {wicket_type.value}"
                    )
        else:
            if player_out_id is not None:
                raise RuleViolationError("player_out_id must be None when no wicket occurs")

        ball_result = aggregate.record_ball(
            bowler_id=effective_bowler_id,
            runs=delivery_in.runs,
            extra_type=delivery_in.extra_type,
            extras=delivery_in.extras,
            wicket_type=wicket_type,
            player_out_id=player_out_id,
            fielder_id=delivery_in.fielder_id,
            new_batter_id=getattr(delivery_in, "new_batter_id", None),
            commentary=delivery_in.commentary,
            explicit_striker_id=effective_striker_id,
            explicit_non_striker_id=effective_non_striker_id,
        )
        # 3. Transition innings to IN_PROGRESS if first ball
        if innings.status == InningsStatus.NOT_STARTED:
            innings.status = InningsStatus.IN_PROGRESS

        # 4. Save delivery
        created_delivery = await self.delivery_repo.create(
            innings.id,
            DeliveryPayload(ball_result),
        )

        # 5. Persist live crease and active bowler back to Innings table
        innings.current_striker_id = aggregate.crease.striker_id
        innings.current_non_striker_id = aggregate.crease.non_striker_id
        innings.current_bowler_id = aggregate.current_bowler_id

        # 6. Check if innings completed
        if aggregate.is_completed:
            innings.status = InningsStatus.COMPLETED

            if match and self.match_repo:
                if innings.innings_number == 1:
                    match.status = MatchStatus.INNINGS_BREAK
                    await self.match_repo.save(match)

                    # Auto-create Innings 2 with target
                    existing_inn2 = await self.innings_repo.get_by_match_and_number(match_id, 2)
                    if not existing_inn2:
                        inn2_target = aggregate.total_runs + 1
                        await self.innings_repo.create(
                            match_id=match_id,
                            innings_in=InningsCreate(
                                innings_number=2,
                                batting_team_id=innings.bowling_team_id,
                                bowling_team_id=innings.batting_team_id,
                                target=inn2_target,
                            ),
                        )
                elif innings.innings_number == 2:
                    match.status = MatchStatus.COMPLETED
                    match.win_margin_runs = aggregate.win_margin_runs
                    match.win_margin_wickets = aggregate.win_margin_wickets
                    if innings.target is not None:
                        if aggregate.total_runs >= innings.target:
                            match.winner = innings.batting_team_id
                        elif aggregate.total_runs < innings.target - 1:
                            match.winner = innings.bowling_team_id
                        else:
                            match.winner = None  # Tied match
                    await self.match_repo.save(match)

        await self.innings_repo.save(innings)
        return created_delivery

    async def set_bowler(self, match_id: int, innings_number: int, bowler_id: int) -> Innings:
        """
        Explicitly selects the bowler for the upcoming over.
        Enforces consecutive over rule and format over quota.
        """
        match = await self.match_repo.get_by_id(match_id) if self.match_repo else None
        if match and match.status == MatchStatus.COMPLETED:
            raise RuleViolationError("Cannot assign bowler: Match is already completed")

        innings = await self.innings_repo.get_by_match_and_number(match_id, innings_number)
        if not innings:
            raise EntityNotFoundError(f"Innings {innings_number} for Match {match_id} not found")
        if innings.status == InningsStatus.COMPLETED:
            raise OverProgressionError(f"Innings {innings_number} is already completed")

        # Validate bowler in bowling squad Playing XI if squad exists
        if self.squad_repo:
            bowling_squad = await self.squad_repo.get_by_match_and_team(match_id, innings.bowling_team_id)
            if bowling_squad and bowling_squad.players:
                playing_xi = {p.player_id for p in bowling_squad.players if p.is_playing_xi}
                if playing_xi and bowler_id not in playing_xi:
                    raise RuleViolationError(f"Bowler {bowler_id} is not in the bowling team's Playing XI")

        # Reconstruct aggregate to enforce cricket domain rules
        existing_deliveries = await self.delivery_repo.list_by_innings(innings.id)
        match_format = match.format if match else "t20"
        aggregate = InningsAggregate.reconstruct(
            innings_id=innings.id,
            match_id=match_id,
            match_format=match_format,
            target=innings.target,
            deliveries=existing_deliveries,
            status=innings.status,
            current_striker_id=innings.current_striker_id,
            current_non_striker_id=innings.current_non_striker_id,
            current_bowler_id=innings.current_bowler_id,
        )

        aggregate.set_bowler(bowler_id)
        innings.current_bowler_id = bowler_id
        return await self.innings_repo.save(innings)

    async def set_incoming_batter(self, match_id: int, innings_number: int, player_id: int) -> Innings:
        """
        Assigns the incoming batter to the crease after a dismissal.
        Part of the 2-step wicket flow.
        """
        match = await self.match_repo.get_by_id(match_id) if self.match_repo else None
        innings = await self.innings_repo.get_by_match_and_number(match_id, innings_number)
        if not innings:
            raise EntityNotFoundError(f"Innings {innings_number} for Match {match_id} not found")
        if innings.status == InningsStatus.COMPLETED:
            raise OverProgressionError(f"Innings {innings_number} is already completed")

        existing_deliveries = await self.delivery_repo.list_by_innings(innings.id)
        match_format = match.format if match else "t20"
        aggregate = InningsAggregate.reconstruct(
            innings_id=innings.id,
            match_id=match_id,
            match_format=match_format,
            target=innings.target,
            deliveries=existing_deliveries,
            status=innings.status,
            current_striker_id=innings.current_striker_id,
            current_non_striker_id=innings.current_non_striker_id,
            current_bowler_id=innings.current_bowler_id,
        )

        if not aggregate.crease.awaiting_new_batter:
            raise RuleViolationError("No incoming batter needed; crease already has active striker and non-striker")

        # Validate incoming batter in batting squad Playing XI if squad exists
        if self.squad_repo:
            batting_squad = await self.squad_repo.get_by_match_and_team(match_id, innings.batting_team_id)
            if batting_squad and batting_squad.players:
                playing_xi = {p.player_id for p in batting_squad.players if p.is_playing_xi}
                if playing_xi and player_id not in playing_xi:
                    raise RuleViolationError(f"Incoming batter {player_id} is not in the batting team's Playing XI")

        aggregate.crease.assign_incoming_batter(player_id)
        innings.current_striker_id = aggregate.crease.striker_id
        innings.current_non_striker_id = aggregate.crease.non_striker_id
        return await self.innings_repo.save(innings)

    async def swap_strike(self, match_id: int, innings_number: int) -> Innings:
        """Manually swaps striker and non-striker ends (e.g. short run or manual correction)."""
        match = await self.match_repo.get_by_id(match_id) if self.match_repo else None
        innings = await self.innings_repo.get_by_match_and_number(match_id, innings_number)
        if not innings:
            raise EntityNotFoundError(f"Innings {innings_number} for Match {match_id} not found")
        if innings.status == InningsStatus.COMPLETED:
            raise OverProgressionError(f"Innings {innings_number} is already completed")

        existing_deliveries = await self.delivery_repo.list_by_innings(innings.id)
        match_format = match.format if match else "t20"
        aggregate = InningsAggregate.reconstruct(
            innings_id=innings.id,
            match_id=match_id,
            match_format=match_format,
            target=innings.target,
            deliveries=existing_deliveries,
            status=innings.status,
            current_striker_id=innings.current_striker_id,
            current_non_striker_id=innings.current_non_striker_id,
            current_bowler_id=innings.current_bowler_id,
        )

        if aggregate.crease.awaiting_new_batter:
            raise RuleViolationError("Cannot swap strike while awaiting incoming batter")

        aggregate.crease.swap_strike()
        innings.current_striker_id = aggregate.crease.striker_id
        innings.current_non_striker_id = aggregate.crease.non_striker_id
        return await self.innings_repo.save(innings)

    async def _assert_delivery_mutable(
        self,
        match_id: int,
        innings: Innings,
        last_ball: Delivery,
    ) -> None:
        """Enforces immutability checkpoints: new bowler set, next innings started, or MOM awarded."""
        match = await self.match_repo.get_by_id(match_id) if self.match_repo else None
        if match and match.mom is not None:
            raise RuleViolationError("Cannot modify or undo deliveries: Man of the Match has already been awarded")

        # Checkpoint: Next innings already started
        if innings.innings_number == 1 and self.innings_repo:
            inn2 = await self.innings_repo.get_by_match_and_number(match_id, 2)
            if inn2 and getattr(inn2, "innings_number", None) == 2 and inn2.id != innings.id:
                if inn2.status != InningsStatus.NOT_STARTED or inn2.current_striker_id is not None:
                    raise RuleViolationError("Cannot modify or undo delivery in Innings 1: Innings 2 has already started")

        # Checkpoint: Next over's bowler already assigned
        existing_deliveries = await self.delivery_repo.list_by_innings(innings.id)
        if isinstance(existing_deliveries, list):
            match_format = match.format if match else "t20"
            aggregate = InningsAggregate.reconstruct(
                innings_id=innings.id,
                match_id=match_id,
                match_format=match_format,
                target=innings.target,
                deliveries=existing_deliveries,
                status=innings.status,
                current_striker_id=innings.current_striker_id,
                current_non_striker_id=innings.current_non_striker_id,
                current_bowler_id=innings.current_bowler_id,
            )

            if last_ball.over < aggregate.current_over and innings.current_bowler_id is not None:
                raise RuleViolationError(
                    "Cannot modify or undo delivery: bowler has already been assigned for the next over"
                )

    async def update_last_delivery(
        self,
        match_id: int,
        innings_number: int,
        delivery_in: ManualDeliveryUpdate,
    ) -> Delivery:
        """Modifies the most recently bowled delivery if not past an immutability checkpoint."""
        innings = await self.innings_repo.get_by_match_and_number(match_id, innings_number)
        if not innings:
            raise EntityNotFoundError(f"Innings {innings_number} for Match {match_id} not found")

        last_ball = await self.delivery_repo.get_last_delivery(innings.id)
        if not last_ball:
            raise EntityNotFoundError("No deliveries found to update in this innings")

        await self._assert_delivery_mutable(match_id, innings, last_ball)

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
        if delivery_in.commentary is not None:
            last_ball.commentary = delivery_in.commentary

        return await self.delivery_repo.save(last_ball)

    async def undo_last_delivery(self, match_id: int, innings_number: int) -> Delivery:
        """Removes the most recently recorded delivery and resets active crease state."""
        innings = await self.innings_repo.get_by_match_and_number(match_id, innings_number)
        if not innings:
            raise EntityNotFoundError(f"Innings {innings_number} for Match {match_id} not found")

        last_ball = await self.delivery_repo.get_last_delivery(innings.id)
        if not last_ball:
            raise EntityNotFoundError("No deliveries found to undo in this innings")

        await self._assert_delivery_mutable(match_id, innings, last_ball)

        await self.delivery_repo.delete(last_ball)

        # Re-derive state from remaining deliveries
        remaining = await self.delivery_repo.list_by_innings(innings.id)
        match = await self.match_repo.get_by_id(match_id) if self.match_repo else None
        match_format = match.format if match else "t20"
        aggregate = InningsAggregate.reconstruct(
            innings_id=innings.id,
            match_id=match_id,
            match_format=match_format,
            target=innings.target,
            deliveries=remaining,
            status=InningsStatus.IN_PROGRESS,
        )

        innings.current_striker_id = aggregate.crease.striker_id
        innings.current_non_striker_id = aggregate.crease.non_striker_id
        innings.current_bowler_id = aggregate.current_bowler_id
        innings.status = InningsStatus.IN_PROGRESS
        await self.innings_repo.save(innings)

        if match and match.status in (MatchStatus.COMPLETED, MatchStatus.INNINGS_BREAK):
            match.status = MatchStatus.LIVE
            match.winner = None
            match.win_margin_runs = None
            match.win_margin_wickets = None
            await self.match_repo.save(match)

        return last_ball

    async def get_live_scorer_state(self, match_id: int, innings_number: int) -> LiveScorerStateResponse:
        """
        Retrieves real-time operational state for the scorer console:
        crease batters, bowler, legal ball counter, eligible bowlers, and whether new batter is awaited.
        """
        match = await self.match_repo.get_by_id(match_id) if self.match_repo else None
        innings = await self.innings_repo.get_by_match_and_number(match_id, innings_number)
        if not innings:
            raise EntityNotFoundError(f"Innings {innings_number} for Match {match_id} not found")

        existing_deliveries = await self.delivery_repo.list_by_innings(innings.id)
        match_format = match.format if match else "t20"
        aggregate = InningsAggregate.reconstruct(
            innings_id=innings.id,
            match_id=match_id,
            match_format=match_format,
            target=innings.target,
            deliveries=existing_deliveries,
            status=innings.status,
            current_striker_id=innings.current_striker_id,
            current_non_striker_id=innings.current_non_striker_id,
            current_bowler_id=innings.current_bowler_id,
        )

        squad_bowler_ids: list[int] = []
        if self.squad_repo:
            bowling_squad = await self.squad_repo.get_by_match_and_team(match_id, innings.bowling_team_id)
            if bowling_squad and bowling_squad.players:
                squad_bowler_ids = [p.player_id for p in bowling_squad.players if p.is_playing_xi]

        eligible_bowler_ids = aggregate.get_eligible_bowlers(squad_bowler_ids)

        # Calculate run rates and chasing metrics
        legal_balls = aggregate.total_legal_balls
        crr = round(aggregate.total_runs / (legal_balls / 6.0), 2) if legal_balls > 0 else 0.0

        target = aggregate.target or innings.target
        runs_needed = None
        balls_remaining = None
        rrr = None
        if target is not None:
            runs_needed = max(0, target - aggregate.total_runs)
            max_balls = aggregate.format_rules.max_overs * aggregate.format_rules.balls_per_over
            balls_remaining = max(0, max_balls - legal_balls)
            if runs_needed == 0:
                rrr = 0.0
            elif balls_remaining > 0:
                rrr = round(runs_needed / (balls_remaining / 6.0), 2)

        # Current over balls formatting
        over_completed = (
            aggregate.current_ball_in_over == 0
            and aggregate.total_legal_balls > 0
            and aggregate.current_bowler_id is None
            and not aggregate.is_completed
        )

        current_over_balls: list[str] = []
        if existing_deliveries:
            target_over = aggregate.current_over
            balls_in_this_over = [d for d in existing_deliveries if getattr(d, "over", 0) == target_over]
            if not balls_in_this_over and (over_completed or aggregate.is_completed):
                balls_in_this_over = [d for d in existing_deliveries if getattr(d, "over", 0) == target_over - 1]
            current_over_balls = [_format_ball_str(d) for d in balls_in_this_over]

        # Next action state machine
        match_status = match.status if match else MatchStatus.LIVE
        innings_status = innings.status
        if aggregate.is_completed:
            innings_status = InningsStatus.COMPLETED

        if match_status == MatchStatus.COMPLETED or (innings.innings_number == 2 and aggregate.is_completed):
            next_action = "MATCH_COMPLETED"
        elif innings.innings_number == 1 and aggregate.is_completed:
            next_action = "INNINGS_BREAK"
        elif aggregate.crease.awaiting_new_batter:
            next_action = "SET_BATTER"
        elif aggregate.current_bowler_id is None:
            next_action = "SET_BOWLER"
        else:
            next_action = "NEXT_BALL"

        return LiveScorerStateResponse(
            match_id=match_id,
            innings_number=innings.innings_number,
            match_status=match_status,
            innings_status=innings_status,
            total_runs=aggregate.total_runs,
            total_wickets=aggregate.total_wickets,
            overs_display=f"{aggregate.completed_overs}.{aggregate.balls_in_over}",
            legal_balls=legal_balls,
            current_run_rate=crr,
            target=target,
            runs_needed=runs_needed,
            balls_remaining=balls_remaining,
            required_run_rate=rrr,
            striker_id=aggregate.crease.striker_id,
            non_striker_id=aggregate.crease.non_striker_id,
            current_bowler_id=aggregate.current_bowler_id,
            awaiting_new_batter=aggregate.crease.awaiting_new_batter,
            over_completed=over_completed,
            current_over_balls=current_over_balls,
            next_action=next_action,
            eligible_bowler_ids=eligible_bowler_ids,
            match_winner=match.winner if match else None,
            win_margin_runs=match.win_margin_runs if match else None,
            win_margin_wickets=match.win_margin_wickets if match else None,
        )

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
    squad_repo = SquadRepository(session)
    return DeliveryService(delivery_repo, innings_repo, match_repo, squad_repo)
