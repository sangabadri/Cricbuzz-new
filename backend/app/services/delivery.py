from app.domain.exceptions import (
    CreaseViolationError,
    EntityNotFoundError,
    OverProgressionError,
    RuleViolationError,
)
from app.domain.innings_aggregate import InningsAggregate
from app.models.delivery import Delivery
from app.models.innings import Innings
from app.models.match import Match
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


EDITABLE_DELIVERY_FIELDS = {
    "runs",
    "extra_type",
    "extras",
    "wicket_type",
    "player_out_id",
    "fielder_id",
    "commentary",
}
NON_NULLABLE_DELIVERY_FIELDS = {"runs", "extras"}


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

    async def _get_match(self, match_id: int, for_update: bool = False) -> Match | None:
        """Loads match row with optional pessimistic row lock (SELECT ... FOR UPDATE)."""
        if not self.match_repo:
            return None
        return await self.match_repo.get_by_id(match_id, for_update=for_update)

    async def _get_innings(self, match_id: int, innings_number: int, for_update: bool = False) -> Innings | None:
        """Loads innings row with optional pessimistic row lock (SELECT ... FOR UPDATE)."""
        return await self.innings_repo.get_by_match_and_number(match_id, innings_number, for_update=for_update)

    async def _resolve_and_validate_wicket_keeper(
        self, match_id: int, bowling_team_id: int, wicket_type: WicketType | None, fielder_id: int | None
    ) -> int | None:
        """
        Enforces that any STUMPED dismissal requires an existing fielding squad with a designated
        wicket-keeper, and that the attributing fielder_id matches that designated keeper.
        Returns the designated wicket-keeper ID if squad exists, or None for non-stumping balls.
        """
        if not self.squad_repo:
            if wicket_type == WicketType.STUMPED:
                raise RuleViolationError("Cannot record stumping: fielding squad does not exist")
            return None

        bowling_squad = await self.squad_repo.get_by_match_and_team(match_id, bowling_team_id)
        if wicket_type == WicketType.STUMPED:
            if not bowling_squad:
                raise RuleViolationError("Cannot record stumping: fielding squad does not exist")
            if bowling_squad.wicket_keeper_id is None:
                raise RuleViolationError("Cannot record stumping: fielding squad has no designated wicket-keeper")
            if fielder_id != bowling_squad.wicket_keeper_id:
                raise RuleViolationError(
                    f"Only the designated wicket-keeper ({bowling_squad.wicket_keeper_id}) can execute a stumping"
                )
            return bowling_squad.wicket_keeper_id

        return bowling_squad.wicket_keeper_id if bowling_squad else None

    async def _reconcile_innings2_target(
        self, match_id: int, innings1: Innings, inn1_aggregate: InningsAggregate
    ) -> None:
        """
        Synchronizes Innings 2 target with Innings 1 aggregate state.
        If Innings 1 is completed, sets target = total_runs + 1 (creating Innings 2 if not present).
        If Innings 1 is in progress (reopened by patch or undo), clears target if Innings 2 has not started.
        Raises RuleViolationError if reconciliation is attempted after Innings 2 has started.
        """
        existing_inn2 = await self.innings_repo.get_by_match_and_number(match_id, 2, for_update=True)
        if existing_inn2 and (getattr(existing_inn2, "innings_number", None) != 2 or existing_inn2.id == innings1.id):
            existing_inn2 = None

        if existing_inn2 and (
            existing_inn2.status != InningsStatus.NOT_STARTED
            or existing_inn2.current_striker_id is not None
        ):
            raise RuleViolationError("Cannot reconcile Innings 2 target: Innings 2 has already started")

        if inn1_aggregate.is_completed:
            inn2_target = inn1_aggregate.total_runs + 1
            if not existing_inn2:
                await self.innings_repo.create(
                    match_id=match_id,
                    innings_in=InningsCreate(
                        innings_number=2,
                        batting_team_id=innings1.bowling_team_id,
                        bowling_team_id=innings1.batting_team_id,
                        target=inn2_target,
                    ),
                )
            else:
                existing_inn2.target = inn2_target
                await self.innings_repo.save(existing_inn2)
        else:
            if existing_inn2:
                existing_inn2.target = None
                await self.innings_repo.save(existing_inn2)

    async def record_delivery(
        self,
        match_id: int,
        innings_number: int,
        delivery_in: DeliveryCreate,
        return_state: bool = False,
    ) -> Delivery | LiveScorerStateResponse:
        """
        Records a new ball bowled in the innings using InningsAggregate.
        Auto-updates strike rotation, bowler quota, and detects innings transitions.
        Acquires aggregate row lock before reading state.
        """
        match = await self._get_match(match_id, for_update=True)
        if match and match.status == MatchStatus.COMPLETED:
            raise RuleViolationError("Match is already completed")

        innings = await self._get_innings(match_id, innings_number, for_update=True)
        if not innings:
            raise EntityNotFoundError(f"Innings {innings_number} for Match {match_id} not found")
        if innings.status == InningsStatus.COMPLETED:
            raise OverProgressionError(f"Innings {innings_number} is already completed")

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

        # Validate delivery state against fundamental cricket laws before keeper/squad checks
        InningsAggregate.validate_delivery_state(
            runs=delivery_in.runs,
            extra_type=delivery_in.extra_type,
            extras=delivery_in.extras,
            wicket_type=wicket_type,
            player_out_id=player_out_id,
            fielder_id=delivery_in.fielder_id,
            striker_id=effective_striker_id,
            non_striker_id=effective_non_striker_id,
            bowler_id=effective_bowler_id,
        )

        fielding_keeper_id = await self._resolve_and_validate_wicket_keeper(
            match_id, innings.bowling_team_id, wicket_type, delivery_in.fielder_id
        )

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
            wicket_keeper_id=fielding_keeper_id,
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

            if innings.innings_number == 1:
                if match and self.match_repo:
                    match.status = MatchStatus.INNINGS_BREAK
                    await self.match_repo.save(match)

                await self._reconcile_innings2_target(match_id, innings, aggregate)
            elif innings.innings_number == 2:
                if match and self.match_repo:
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

        if return_state:
            all_deliveries = existing_deliveries + [created_delivery]
            return await self._build_scorer_state(match, innings, aggregate, all_deliveries)

        return created_delivery

    async def set_bowler(self, match_id: int, innings_number: int, bowler_id: int) -> Innings:
        """
        Explicitly selects the bowler for the upcoming over.
        Enforces consecutive over rule and format over quota.
        Acquires Match lock, then Innings lock before reading state.
        """
        match = await self._get_match(match_id, for_update=True)
        if not match:
            raise EntityNotFoundError(f"Match with ID {match_id} not found")
        if match.status == MatchStatus.COMPLETED:
            raise RuleViolationError("Cannot assign bowler: Match is already completed")

        innings = await self._get_innings(match_id, innings_number, for_update=True)
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
        Acquires Match lock, then Innings lock before reading state.
        """
        match = await self._get_match(match_id, for_update=True)
        if not match:
            raise EntityNotFoundError(f"Match with ID {match_id} not found")
        if match.status == MatchStatus.COMPLETED:
            raise RuleViolationError("Cannot assign batter: Match is already completed")

        innings = await self._get_innings(match_id, innings_number, for_update=True)
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
        """
        Manually swaps striker and non-striker ends (e.g. short run or manual correction).
        Acquires Match lock, then Innings lock before reading state.
        """
        match = await self._get_match(match_id, for_update=True)
        if not match:
            raise EntityNotFoundError(f"Match with ID {match_id} not found")
        if match.status == MatchStatus.COMPLETED:
            raise RuleViolationError("Cannot swap strike: Match is already completed")

        innings = await self._get_innings(match_id, innings_number, for_update=True)
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
            inn2 = await self.innings_repo.get_by_match_and_number(match_id, 2, for_update=True)
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
        """
        Modifies the most recently bowled delivery if not past an immutability checkpoint.
        Acquires aggregate row lock, applies explicit PATCH changes, validates complete resulting delivery,
        reconstructs aggregate, and atomically persists delivery and innings state.
        """
        match = await self._get_match(match_id, for_update=True)

        innings = await self._get_innings(match_id, innings_number, for_update=True)
        if not innings:
            raise EntityNotFoundError(f"Innings {innings_number} for Match {match_id} not found")

        last_ball = await self.delivery_repo.get_last_delivery(innings.id)
        if not last_ball:
            raise EntityNotFoundError("No deliveries found to update in this innings")

        await self._assert_delivery_mutable(match_id, innings, last_ball)

        supplied_fields = delivery_in.model_fields_set

        # Check for un-editable or illegal fields in supplied_fields
        for field in supplied_fields:
            if field not in EDITABLE_DELIVERY_FIELDS:
                raise RuleViolationError(f"Field '{field}' cannot be modified")

        # Explicit null checks for non-nullable fields
        for field in NON_NULLABLE_DELIVERY_FIELDS:
            if field in supplied_fields and getattr(delivery_in, field) is None:
                raise RuleViolationError(f"Field '{field}' is non-nullable and cannot be set to null")

        # Base candidate values start with current persisted delivery values (omitted fields retained)
        cand_runs = delivery_in.runs if "runs" in supplied_fields else last_ball.runs
        cand_extra_type = delivery_in.extra_type if "extra_type" in supplied_fields else last_ball.extra_type
        cand_extras = delivery_in.extras if "extras" in supplied_fields else last_ball.extras
        cand_wicket_type = delivery_in.wicket_type if "wicket_type" in supplied_fields else last_ball.wicket_type
        cand_player_out_id = delivery_in.player_out_id if "player_out_id" in supplied_fields else last_ball.player_out_id
        cand_fielder_id = delivery_in.fielder_id if "fielder_id" in supplied_fields else last_ball.fielder_id
        cand_commentary = delivery_in.commentary if "commentary" in supplied_fields else last_ball.commentary

        # Enforce dependent group consistency when only one field of a dependent group is supplied:
        # Group 1: Dismissals (wicket_type, player_out_id, fielder_id)
        if "wicket_type" in supplied_fields:
            if cand_wicket_type is None:
                # Accidental wicket cleared: clear stale dismissal info if not explicitly provided
                if "player_out_id" not in supplied_fields:
                    cand_player_out_id = None
                if "fielder_id" not in supplied_fields:
                    cand_fielder_id = None
            else:
                # Wicket recorded or changed
                if "player_out_id" not in supplied_fields:
                    if cand_wicket_type != WicketType.RUN_OUT:
                        cand_player_out_id = last_ball.batsman_id
                if cand_wicket_type in (WicketType.BOWLED, WicketType.LBW, WicketType.HIT_WICKET):
                    if "fielder_id" not in supplied_fields:
                        cand_fielder_id = None

        # Group 2: Extras (extra_type, extras, runs)
        if "extra_type" in supplied_fields:
            if cand_extra_type is None:
                # Accidental extra cleared: clear stale extras to 0 if not explicitly provided
                if "extras" not in supplied_fields:
                    cand_extras = 0
            else:
                # Extra type added/changed: if extras was omitted and currently 0, default to 1 for wide/noball
                if "extras" not in supplied_fields and cand_extras == 0:
                    if cand_extra_type in (ExtraType.WIDE, ExtraType.NOBALL):
                        cand_extras = 1

        # Validate complete resulting delivery state against domain rules before mutating any persistent state
        InningsAggregate.validate_delivery_state(
            runs=cand_runs,
            extra_type=cand_extra_type,
            extras=cand_extras,
            wicket_type=cand_wicket_type,
            player_out_id=cand_player_out_id,
            fielder_id=cand_fielder_id,
            striker_id=last_ball.batsman_id,
            non_striker_id=last_ball.non_striker_id,
            bowler_id=last_ball.bowler_id,
        )

        fielding_keeper_id = await self._resolve_and_validate_wicket_keeper(
            match_id, innings.bowling_team_id, cand_wicket_type, cand_fielder_id
        )

        # Re-derive crease and aggregate state from simulated deliveries before saving
        all_deliveries = await self.delivery_repo.list_by_innings(innings.id)
        match_format = match.format if match else "t20"

        # Build candidate delivery list where last_ball reflects the candidate changes
        simulated_deliveries = []
        for d in all_deliveries:
            if d.id == last_ball.id:
                simulated_deliveries.append(
                    DeliveryPayload({
                        "id": d.id,
                        "innings_id": d.innings_id,
                        "over": d.over,
                        "ball": d.ball,
                        "bowler_id": d.bowler_id,
                        "batsman_id": d.batsman_id,
                        "non_striker_id": d.non_striker_id,
                        "runs": cand_runs,
                        "extra_type": cand_extra_type,
                        "extras": cand_extras,
                        "wicket_type": cand_wicket_type,
                        "player_out_id": cand_player_out_id,
                        "fielder_id": cand_fielder_id,
                        "commentary": cand_commentary,
                    })
                )
            else:
                simulated_deliveries.append(d)

        aggregate = InningsAggregate.reconstruct(
            innings_id=innings.id,
            match_id=match_id,
            match_format=match_format,
            target=innings.target,
            deliveries=simulated_deliveries,
            status=InningsStatus.IN_PROGRESS,
            current_striker_id=None,
            current_non_striker_id=None,
        )

        # Apply validated changes to persisted delivery
        last_ball.runs = cand_runs
        last_ball.extra_type = cand_extra_type
        last_ball.extras = cand_extras
        last_ball.wicket_type = cand_wicket_type
        last_ball.player_out_id = cand_player_out_id
        last_ball.fielder_id = cand_fielder_id
        last_ball.commentary = cand_commentary

        saved_ball = await self.delivery_repo.save(last_ball)

        innings.current_striker_id = aggregate.crease.striker_id
        innings.current_non_striker_id = aggregate.crease.non_striker_id
        innings.current_bowler_id = aggregate.current_bowler_id
        innings.status = InningsStatus.COMPLETED if aggregate.is_completed else InningsStatus.IN_PROGRESS
        await self.innings_repo.save(innings)

        if match and self.match_repo:
            if not aggregate.is_completed and match.status in (MatchStatus.COMPLETED, MatchStatus.INNINGS_BREAK):
                match.status = MatchStatus.LIVE
                match.winner = None
                match.win_margin_runs = None
                match.win_margin_wickets = None
                await self.match_repo.save(match)
            elif aggregate.is_completed:
                if innings.innings_number == 1:
                    if match.status == MatchStatus.LIVE:
                        match.status = MatchStatus.INNINGS_BREAK
                        await self.match_repo.save(match)
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
                            match.winner = None
                    await self.match_repo.save(match)

        if innings.innings_number == 1:
            await self._reconcile_innings2_target(match_id, innings, aggregate)

        return saved_ball

    async def undo_last_delivery(self, match_id: int, innings_number: int) -> Delivery:
        """Removes the most recently recorded delivery and resets active crease state."""
        match = await self._get_match(match_id, for_update=True)

        innings = await self._get_innings(match_id, innings_number, for_update=True)
        if not innings:
            raise EntityNotFoundError(f"Innings {innings_number} for Match {match_id} not found")

        last_ball = await self.delivery_repo.get_last_delivery(innings.id)
        if not last_ball:
            raise EntityNotFoundError("No deliveries found to undo in this innings")

        await self._assert_delivery_mutable(match_id, innings, last_ball)

        await self.delivery_repo.delete(last_ball)

        # Re-derive state from remaining deliveries
        remaining = await self.delivery_repo.list_by_innings(innings.id)
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

        if innings.innings_number == 1:
            await self._reconcile_innings2_target(match_id, innings, aggregate)

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

        return await self._build_scorer_state(match, innings, aggregate, existing_deliveries)

    async def _build_scorer_state(
        self,
        match: Any,
        innings: Innings,
        aggregate: InningsAggregate,
        deliveries: list[Any],
    ) -> LiveScorerStateResponse:
        squad_bowler_ids: list[int] = []
        if self.squad_repo:
            bowling_squad = await self.squad_repo.get_by_match_and_team(innings.match_id, innings.bowling_team_id)
            if bowling_squad and bowling_squad.players:
                squad_bowler_ids = [p.player_id for p in bowling_squad.players if p.is_playing_xi]

        eligible_bowler_ids = aggregate.get_eligible_bowlers(squad_bowler_ids)

        # Calculate run rates and chasing metrics
        legal_balls = aggregate.total_legal_balls
        crr = round(aggregate.total_runs / (legal_balls / float(aggregate.format_rules.balls_per_over)), 2) if legal_balls > 0 else 0.0

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
                rrr = round(runs_needed / (balls_remaining / float(aggregate.format_rules.balls_per_over)), 2)

        # Current over balls formatting
        over_completed = (
            aggregate.current_ball_in_over == 0
            and aggregate.total_legal_balls > 0
            and aggregate.current_bowler_id is None
            and not aggregate.is_completed
        )

        current_over_balls: list[str] = []
        if deliveries:
            target_over = aggregate.current_over
            balls_in_this_over = [d for d in deliveries if getattr(d, "over", 0) == target_over]
            if not balls_in_this_over and (over_completed or aggregate.is_completed):
                balls_in_this_over = [d for d in deliveries if getattr(d, "over", 0) == target_over - 1]
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
            match_id=innings.match_id,
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



