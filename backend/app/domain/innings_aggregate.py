"""
Innings Aggregate Root.
Coordinates deliveries, crease state, bowler quotas, over progression, and innings completion.
Pure domain logic decoupled from database models and web frameworks.
"""

from typing import Any
from app.domain.crease import CreaseState
from app.domain.exceptions import CreaseViolationError, OverProgressionError, RuleViolationError
from app.domain.rules.formats import MatchFormatRules, get_format_rules
from app.domain.enums import ExtraType, InningsStatus, MatchFormat, WicketType


class InningsAggregate:
    """
    Aggregate root managing the lifecycle, scoring, bowler rules, and state of a single cricket innings.
    """

    def __init__(
        self,
        innings_id: int,
        match_id: int,
        format_rules: MatchFormatRules,
        target: int | None = None,
        crease: CreaseState | None = None,
    ):
        self.innings_id = innings_id
        self.match_id = match_id
        self.format_rules = format_rules
        self.target = target
        self.crease = crease or CreaseState()

        # Progression & scoring counters
        self.current_over: int = 0
        self.current_ball_in_over: int = 0  # Legal balls in current over (0 to 6)
        self.current_attempt_in_over: int = 0  # Sequential delivery attempt in current over (1, 2, ...)
        self.total_legal_balls: int = 0
        self.total_runs: int = 0
        self.total_wickets: int = 0

        # Bowler tracking
        self.bowler_overs: dict[int, int] = {}  # bowler_id -> completed overs
        self.current_bowler_id: int | None = None
        self.last_completed_over_bowler_id: int | None = None

        # Completion state
        self.is_completed: bool = False
        self.completion_reason: str | None = None
        self.win_margin_runs: int | None = None
        self.win_margin_wickets: int | None = None

        # Stored delivery records
        self.deliveries: list[dict[str, Any]] = []

    @property
    def completed_overs(self) -> int:
        return self.total_legal_balls // self.format_rules.balls_per_over

    @property
    def balls_in_over(self) -> int:
        return self.total_legal_balls % self.format_rules.balls_per_over

    def set_bowler(self, bowler_id: int) -> None:
        """
        Explicitly assigns the bowler for the upcoming over.
        Called by scorer console before the first ball of an over.
        """
        if self.current_ball_in_over > 0:
            raise OverProgressionError(
                f"Cannot change bowler mid-over (over {self.current_over} is in progress)"
            )
        self.validate_bowler(bowler_id)
        self.current_bowler_id = bowler_id

    def get_eligible_bowlers(self, squad_bowler_ids: list[int]) -> list[int]:
        """
        Returns list of player IDs from fielding squad eligible to bowl next over.
        Filters out current batters, consecutive over bowler, and quota-maxed bowlers.
        """
        eligible: list[int] = []
        for pid in squad_bowler_ids:
            if pid in (self.crease.striker_id, self.crease.non_striker_id):
                continue
            if self.last_completed_over_bowler_id is not None and pid == self.last_completed_over_bowler_id:
                continue
            completed = self.bowler_overs.get(pid, 0)
            if completed >= self.format_rules.max_bowler_overs:
                continue
            eligible.append(pid)
        return eligible

    def validate_bowler(self, bowler_id: int) -> None:
        """Enforces bowler quota and consecutive-over restrictions."""
        # Bowler cannot be currently batting
        if bowler_id in (self.crease.striker_id, self.crease.non_striker_id):
            raise RuleViolationError(f"Player {bowler_id} is currently batting and cannot bowl")

        # If at the start of an over:
        if self.current_bowler_id is None:
            if self.last_completed_over_bowler_id is not None and bowler_id == self.last_completed_over_bowler_id:
                raise OverProgressionError(
                    f"Bowler {bowler_id} cannot bowl consecutive overs (bowled over {self.current_over - 1})"
                )
            completed_overs = self.bowler_overs.get(bowler_id, 0)
            if not self.format_rules.can_bowler_bowl(completed_overs, self.current_ball_in_over + 1):
                raise OverProgressionError(
                    f"Bowler {bowler_id} has reached maximum quota of {self.format_rules.max_bowler_overs} overs"
                )
        else:
            # Middle of the over: the bowler must be the one who started this over
            if bowler_id != self.current_bowler_id:
                raise OverProgressionError(
                    f"Over {self.current_over} is in progress by bowler {self.current_bowler_id}. "
                    f"Bowler {bowler_id} cannot bowl this ball."
                )

    @staticmethod
    def validate_extras_rules(extra_type: ExtraType | None, extras: int) -> None:
        """Validates cricket extras rules."""
        if extras < 0:
            raise RuleViolationError("Extras cannot be negative")
        if extra_type in (ExtraType.WIDE, ExtraType.NOBALL) and extras < 1:
            raise RuleViolationError(f"Extras must be at least 1 for {extra_type.value}")
        if extra_type is None and extras != 0:
            raise RuleViolationError("Extras must be 0 when extra_type is None")

    def validate_dismissal_rules(
        self,
        wicket_type: WicketType | None,
        player_out_id: int | None,
        bowler_id: int,
        fielder_id: int | None,
        striker_id: int | None = None,
        non_striker_id: int | None = None,
    ) -> None:
        """Validates cricket rules for wickets, dismissals, and fielders."""
        effective_striker = striker_id if striker_id is not None else (self.crease.striker_id if hasattr(self, "crease") else None)
        effective_non_striker = non_striker_id if non_striker_id is not None else (self.crease.non_striker_id if hasattr(self, "crease") else None)

        if wicket_type is None:
            if player_out_id is not None:
                raise RuleViolationError("player_out_id must be None when no wicket occurs")
            if fielder_id is not None:
                raise RuleViolationError("fielder_id must be None when no wicket occurs")
            return

        if player_out_id is None:
            raise RuleViolationError("player_out_id is required when a wicket occurs")

        if effective_striker is not None and effective_non_striker is not None:
            if player_out_id not in (effective_striker, effective_non_striker):
                raise CreaseViolationError(
                    f"player_out_id {player_out_id} must be either the striker ({effective_striker}) "
                    f"or non-striker ({effective_non_striker})"
                )

        if wicket_type == WicketType.CAUGHT:
            if fielder_id is None:
                raise RuleViolationError("fielder_id is required for caught dismissals")

        if wicket_type in (WicketType.BOWLED, WicketType.LBW, WicketType.HIT_WICKET):
            if fielder_id is not None:
                raise RuleViolationError(f"fielder_id must be None for {wicket_type.value} dismissals")

    def record_ball(
        self,
        bowler_id: int | None = None,
        runs: int = 0,
        extra_type: ExtraType | None = None,
        extras: int = 0,
        wicket_type: WicketType | None = None,
        player_out_id: int | None = None,
        fielder_id: int | None = None,
        new_batter_id: int | None = None,
        commentary: str | None = None,
        explicit_striker_id: int | None = None,
        explicit_non_striker_id: int | None = None,
    ) -> dict[str, Any]:
        """
        Processes a single ball bowled in the innings.
        Updates crease, over counters, bowler overs, and checks for innings completion.
        """
        if self.is_completed:
            raise OverProgressionError(f"Innings is already completed: {self.completion_reason}")

        if self.crease.awaiting_new_batter:
            raise CreaseViolationError(
                "Wicket fell! Must set incoming batter before bowling the next ball."
            )

        # Setup or synchronize crease if explicit batters were passed
        if explicit_striker_id is not None and explicit_non_striker_id is not None:
            if self.crease.striker_id is None and self.crease.non_striker_id is None:
                self.crease.initialize(explicit_striker_id, explicit_non_striker_id)
            elif (
                self.crease.striker_id != explicit_striker_id
                or self.crease.non_striker_id != explicit_non_striker_id
            ):
                self.crease.set_active_batters(explicit_striker_id, explicit_non_striker_id)

        if self.crease.striker_id is None or self.crease.non_striker_id is None:
            raise CreaseViolationError("Striker and non-striker must be established on the crease")

        # 1. Validate basic delivery values and extras
        if not (0 <= runs <= 6):
            raise RuleViolationError("Runs must be between 0 and 6")
        self.validate_extras_rules(extra_type, extras)

        # 2. Determine and validate bowler
        if bowler_id is None:
            if self.current_bowler_id is None:
                raise OverProgressionError("No bowler assigned for this over. Set bowler first.")
            bowler_id = self.current_bowler_id
        else:
            self.validate_bowler(bowler_id)
            if self.current_bowler_id is None:
                self.current_bowler_id = bowler_id

        # 3. Auto-derive player_out_id for non-runout dismissals if omitted
        if wicket_type is not None:
            if player_out_id is None:
                if wicket_type != WicketType.RUN_OUT:
                    player_out_id = self.crease.striker_id
                else:
                    raise RuleViolationError("player_out_id is required for run out dismissals")
            elif wicket_type != WicketType.RUN_OUT and player_out_id != self.crease.striker_id:
                raise CreaseViolationError(
                    f"Only the striker ({self.crease.striker_id}) can be dismissed for {wicket_type.value}"
                )

        # Validate dismissal & fielder rules
        self.validate_dismissal_rules(wicket_type, player_out_id, bowler_id, fielder_id)

        # 4. Determine ball characteristics & sequential attempt
        is_legal = extra_type not in (ExtraType.WIDE, ExtraType.NOBALL)
        over_number = self.current_over
        self.current_attempt_in_over += 1
        ball_number = self.current_attempt_in_over
        delivery_index = len(self.deliveries) + 1

        active_striker_id = self.crease.striker_id
        active_non_striker_id = self.crease.non_striker_id

        # Physical running happens for runs off bat OR bye / leg-bye extras
        running_runs = extras if extra_type in (ExtraType.BYE, ExtraType.LEGBYE) else runs

        # 5. Handle dismissal on the crease if wicket occurred
        if wicket_type is not None and player_out_id is not None:
            self.total_wickets += 1
            self.crease.handle_dismissal(
                out_player_id=player_out_id,
                new_batter_id=new_batter_id,
                wicket_type=wicket_type,
                crossed_runs=running_runs,
            )
        else:
            # 6. Strike rotation from runs scored
            self.crease.handle_runs(running_runs)

        # 7. Increment legal ball counts
        if is_legal:
            self.current_ball_in_over += 1
            self.total_legal_balls += 1

        total_ball_runs = runs + extras
        self.total_runs += total_ball_runs

        # 8. Check for end of over (6 legal balls bowled)
        over_completed = False
        if is_legal and self.current_ball_in_over >= self.format_rules.balls_per_over:
            over_completed = True
            # Batters swap ends at the conclusion of an over if both are established
            if self.crease.striker_id is not None and self.crease.non_striker_id is not None:
                self.crease.rotate_strike_at_over_end()

            # Record bowler completed over
            self.bowler_overs[bowler_id] = self.bowler_overs.get(bowler_id, 0) + 1
            self.last_completed_over_bowler_id = bowler_id
            self.current_bowler_id = None
            self.current_over += 1
            self.current_ball_in_over = 0
            self.current_attempt_in_over = 0

        # 9. Evaluate Innings Completion conditions
        self._check_innings_completion()

        delivery_record = {
            "delivery_index": delivery_index,
            "over": over_number,
            "ball": ball_number,
            "is_legal_ball": is_legal,
            "bowler_id": bowler_id,
            "batsman_id": active_striker_id,
            "non_striker_id": active_non_striker_id,
            "runs": runs,
            "extra_type": extra_type,
            "extras": extras,
            "wicket_type": wicket_type,
            "player_out_id": player_out_id,
            "fielder_id": fielder_id,
            "new_batter_id": new_batter_id,
            "commentary": commentary,
            "is_legal": is_legal,
            "over_completed": over_completed,
        }
        self.deliveries.append(delivery_record)
        return delivery_record

    def _check_innings_completion(self) -> None:
        """Determines if the innings has reached a terminal condition and computes margins."""
        if self.total_wickets >= self.format_rules.max_wickets:
            self.is_completed = True
            self.completion_reason = f"All out ({self.total_wickets} wickets lost)"
            if self.target is not None:
                if self.total_runs < self.target - 1:
                    self.win_margin_runs = (self.target - 1) - self.total_runs
                    self.win_margin_wickets = None
                elif self.total_runs == self.target - 1:
                    self.win_margin_runs = 0
                    self.win_margin_wickets = 0
            return

        # Check if target achieved (must be checked BEFORE overs completed!)
        if self.target is not None and self.total_runs >= self.target:
            self.is_completed = True
            self.completion_reason = f"Target of {self.target} runs reached ({self.total_runs} scored)"
            self.win_margin_wickets = self.format_rules.max_wickets - self.total_wickets
            self.win_margin_runs = None
            return

        if self.total_legal_balls >= self.format_rules.max_overs * self.format_rules.balls_per_over:
            self.is_completed = True
            self.completion_reason = f"Completed all {self.format_rules.max_overs} overs"
            if self.target is not None:
                if self.total_runs < self.target - 1:
                    self.win_margin_runs = (self.target - 1) - self.total_runs
                    self.win_margin_wickets = None
                elif self.total_runs == self.target - 1:
                    self.win_margin_runs = 0
                    self.win_margin_wickets = 0
            return

    @classmethod
    def reconstruct(
        cls,
        innings_id: int,
        match_id: int,
        match_format: str | Any,
        target: int | None,
        deliveries: list[Any],
        status: InningsStatus | None = None,
        current_striker_id: int | None = None,
        current_non_striker_id: int | None = None,
        current_bowler_id: int | None = None,
    ) -> "InningsAggregate":
        """
        Reconstructs an InningsAggregate from persisted deliveries and metadata.
        Guarantees crease state, bowler tallies, and over counters match past balls.
        """
        format_rules = get_format_rules(match_format)
        aggregate = cls(
            innings_id=innings_id,
            match_id=match_id,
            format_rules=format_rules,
            target=target,
        )

        for d in deliveries:
            # Replay each delivery state
            d_runs = getattr(d, "runs", 0) if not isinstance(d, dict) else d.get("runs", 0)
            if d_runs is None:
                d_runs = 0
            d_extra_type = getattr(d, "extra_type", d.get("extra_type", None) if isinstance(d, dict) else None)
            d_extras = getattr(d, "extras", 0) if not isinstance(d, dict) else d.get("extras", 0)
            if d_extras is None:
                d_extras = 0
            d_bowler_id = getattr(d, "bowler_id", d.get("bowler_id", None) if isinstance(d, dict) else None)
            d_striker_id = getattr(d, "batsman_id", d.get("batsman_id", None) if isinstance(d, dict) else None)
            d_non_striker_id = getattr(d, "non_striker_id", d.get("non_striker_id", None) if isinstance(d, dict) else None)
            d_wicket_type = getattr(d, "wicket_type", d.get("wicket_type", None) if isinstance(d, dict) else None)
            d_player_out = getattr(d, "player_out_id", d.get("player_out_id", None) if isinstance(d, dict) else None)
            d_fielder_id = getattr(d, "fielder_id", d.get("fielder_id", None) if isinstance(d, dict) else None)
            d_new_batter_id = getattr(d, "new_batter_id", d.get("new_batter_id", None) if isinstance(d, dict) else None)
            d_commentary = getattr(d, "commentary", d.get("commentary", None) if isinstance(d, dict) else None)
            d_delivery_index = getattr(d, "delivery_index", d.get("delivery_index", None) if isinstance(d, dict) else None)
            d_over = getattr(d, "over", d.get("over", 0) if isinstance(d, dict) else 0)
            d_ball = getattr(d, "ball", d.get("ball", 1) if isinstance(d, dict) else 1)

            # Align crease
            if aggregate.crease.striker_id is None and d_striker_id is not None and d_non_striker_id is not None:
                aggregate.crease.initialize(d_striker_id, d_non_striker_id)
            elif d_striker_id is not None and d_non_striker_id is not None:
                aggregate.crease.striker_id = d_striker_id
                aggregate.crease.non_striker_id = d_non_striker_id

            is_legal = d_extra_type not in (ExtraType.WIDE, ExtraType.NOBALL)

            if d_wicket_type is not None and d_player_out is not None:
                aggregate.total_wickets += 1
                if d_player_out not in aggregate.crease.dismissed_player_ids:
                    aggregate.crease.dismissed_player_ids.append(d_player_out)
                if d_player_out == aggregate.crease.striker_id:
                    aggregate.crease.striker_id = d_new_batter_id
                elif d_player_out == aggregate.crease.non_striker_id:
                    aggregate.crease.non_striker_id = d_new_batter_id
                if d_new_batter_id is None and len(aggregate.crease.dismissed_player_ids) < format_rules.max_wickets:
                    aggregate.crease.awaiting_new_batter = True

            running_runs = d_extras if d_extra_type in (ExtraType.BYE, ExtraType.LEGBYE) else d_runs
            if d_wicket_type is not None:
                if d_wicket_type == WicketType.RUN_OUT and running_runs % 2 != 0:
                    aggregate.crease.rotate_strike()
            elif aggregate.crease.striker_id is not None:
                aggregate.crease.handle_runs(running_runs)

            # Over attempt tracking
            if aggregate.current_over != d_over:
                aggregate.current_over = d_over
                aggregate.current_attempt_in_over = 0
                aggregate.current_ball_in_over = 0

            aggregate.current_attempt_in_over += 1

            if is_legal:
                aggregate.current_ball_in_over += 1
                aggregate.total_legal_balls += 1

            aggregate.total_runs += d_runs + d_extras
            aggregate.current_bowler_id = d_bowler_id
            aggregate.current_over = d_over

            if is_legal and aggregate.current_ball_in_over >= format_rules.balls_per_over:
                if aggregate.crease.striker_id is not None and aggregate.crease.non_striker_id is not None:
                    aggregate.crease.rotate_strike_at_over_end()
                aggregate.bowler_overs[d_bowler_id] = aggregate.bowler_overs.get(d_bowler_id, 0) + 1
                aggregate.last_completed_over_bowler_id = d_bowler_id
                aggregate.current_bowler_id = None
                aggregate.current_over = d_over + 1
                aggregate.current_ball_in_over = 0
                aggregate.current_attempt_in_over = 0

            aggregate.deliveries.append({
                "delivery_index": d_delivery_index or len(aggregate.deliveries) + 1,
                "over": d_over,
                "ball": d_ball,
                "is_legal_ball": is_legal,
                "bowler_id": d_bowler_id,
                "batsman_id": d_striker_id,
                "non_striker_id": d_non_striker_id,
                "runs": d_runs,
                "extra_type": d_extra_type,
                "extras": d_extras,
                "wicket_type": d_wicket_type,
                "player_out_id": d_player_out,
                "fielder_id": d_fielder_id,
                "new_batter_id": d_new_batter_id,
                "commentary": d_commentary,
                "is_legal": is_legal,
                "over_completed": is_legal and aggregate.current_ball_in_over == 0,
            })

        # Override/rehydrate from DB if provided (especially for 0-delivery or live crease state)
        if current_striker_id is not None:
            aggregate.crease.striker_id = current_striker_id
        elif aggregate.crease.striker_id is None and len(aggregate.crease.dismissed_player_ids) > 0:
            if len(aggregate.crease.dismissed_player_ids) < format_rules.max_wickets:
                aggregate.crease.awaiting_new_batter = True

        if current_non_striker_id is not None:
            aggregate.crease.non_striker_id = current_non_striker_id
        elif aggregate.crease.non_striker_id is None and len(aggregate.crease.dismissed_player_ids) > 0:
            if len(aggregate.crease.dismissed_player_ids) < format_rules.max_wickets:
                aggregate.crease.awaiting_new_batter = True

        if current_bowler_id is not None:
            aggregate.current_bowler_id = current_bowler_id

        if aggregate.crease.striker_id is not None and aggregate.crease.non_striker_id is not None:
            aggregate.crease.awaiting_new_batter = False

        if status == InningsStatus.COMPLETED:
            aggregate.is_completed = True
            aggregate.completion_reason = "Marked as completed"
        else:
            aggregate._check_innings_completion()

        return aggregate
