"""
Crease state management representing the two batters on the pitch, strike ownership,
and dismissal rules.
"""

from app.domain.exceptions import CreaseViolationError
from app.domain.enums import WicketType


class CreaseState:
    """
    Encapsulates the state and business logic of the batting crease during an innings.
    Tracks striker, non-striker, dismissed batters, and enforces cricket crease rules.
    """

    def __init__(
        self,
        striker_id: int | None = None,
        non_striker_id: int | None = None,
        dismissed_player_ids: list[int] | None = None,
        awaiting_new_batter: bool = False,
    ):
        self.striker_id: int | None = striker_id
        self.non_striker_id: int | None = non_striker_id
        self.dismissed_player_ids: list[int] = list(dismissed_player_ids or [])
        self.awaiting_new_batter: bool = awaiting_new_batter

        if self.striker_id is not None and self.non_striker_id is not None:
            self._validate_distinct_batters(self.striker_id, self.non_striker_id)

    def _validate_distinct_batters(self, striker_id: int, non_striker_id: int) -> None:
        if striker_id == non_striker_id:
            raise CreaseViolationError("Striker and non-striker cannot be the same player")

    def initialize(self, striker_id: int, non_striker_id: int) -> None:
        """Sets the opening batters at the start of an innings."""
        self._validate_distinct_batters(striker_id, non_striker_id)
        if striker_id in self.dismissed_player_ids or non_striker_id in self.dismissed_player_ids:
            raise CreaseViolationError("Cannot assign a dismissed player to the crease")
        self.striker_id = striker_id
        self.non_striker_id = non_striker_id
        self.awaiting_new_batter = False

    def set_active_batters(self, striker_id: int, non_striker_id: int) -> None:
        """Updates the active batters at the crease, ensuring valid state."""
        self._validate_distinct_batters(striker_id, non_striker_id)
        if striker_id in self.dismissed_player_ids:
            raise CreaseViolationError(f"Striker (Player {striker_id}) has already been dismissed")
        if non_striker_id in self.dismissed_player_ids:
            raise CreaseViolationError(f"Non-striker (Player {non_striker_id}) has already been dismissed")
        self.striker_id = striker_id
        self.non_striker_id = non_striker_id
        self.awaiting_new_batter = False

    def rotate_strike(self) -> None:
        """Swaps striker and non-striker ends."""
        self.striker_id, self.non_striker_id = self.non_striker_id, self.striker_id

    def rotate_strike_at_over_end(self) -> None:
        """Called at the conclusion of an over to swap ends."""
        self.rotate_strike()

    def swap_strike(self) -> None:
        """Manual strike swap called by scorer (e.g. short run or umpire correction)."""
        if self.striker_id is None or self.non_striker_id is None:
            raise CreaseViolationError("Cannot swap strike when crease is incomplete")
        self.rotate_strike()

    def handle_runs(self, runs: int) -> None:
        """
        Rotates strike on odd physical runs completed (1, 3, 5).
        Even runs (0, 2, 4, 6) keep the striker on strike.
        """
        if runs % 2 != 0:
            self.rotate_strike()

    def handle_dismissal(
        self,
        out_player_id: int,
        new_batter_id: int | None = None,
        wicket_type: WicketType | None = None,
        crossed_runs: int = 0,
    ) -> None:
        """
        Enforces dismissal rules, marks player as dismissed, and introduces or awaits a new batter.
        """
        if out_player_id not in (self.striker_id, self.non_striker_id):
            raise CreaseViolationError(
                f"Dismissed player {out_player_id} is not currently at the crease "
                f"(striker: {self.striker_id}, non-striker: {self.non_striker_id})"
            )

        # Validate non-striker dismissal constraint
        if out_player_id == self.non_striker_id:
            if wicket_type is not None and wicket_type != WicketType.RUN_OUT:
                raise CreaseViolationError(
                    f"Non-striker cannot be dismissed by {wicket_type.value}. Only run-out is valid for the non-striker."
                )

        # Mark player out
        self.dismissed_player_ids.append(out_player_id)

        if new_batter_id is not None:
            if new_batter_id in self.dismissed_player_ids:
                raise CreaseViolationError(
                    f"Player {new_batter_id} has already been dismissed and cannot bat again."
                )
            remaining_batter = self.non_striker_id if out_player_id == self.striker_id else self.striker_id
            if new_batter_id == remaining_batter:
                raise CreaseViolationError(
                    f"Player {new_batter_id} is already at the crease as the other batter."
                )
            if out_player_id == self.striker_id:
                self.striker_id = new_batter_id
            else:
                self.non_striker_id = new_batter_id
            self.awaiting_new_batter = False
        else:
            # Vacate the crease spot and await incoming batter
            if out_player_id == self.striker_id:
                self.striker_id = None
            else:
                self.non_striker_id = None
            self.awaiting_new_batter = True

        if crossed_runs % 2 != 0:
            self.rotate_strike()

    def assign_incoming_batter(self, new_batter_id: int) -> None:
        """Places the incoming batter at the vacant crease spot."""
        if not self.awaiting_new_batter and self.striker_id is not None and self.non_striker_id is not None:
            raise CreaseViolationError("Crease is already full; no incoming batter is expected")

        if new_batter_id in self.dismissed_player_ids:
            raise CreaseViolationError(
                f"Player {new_batter_id} has already been dismissed and cannot bat again"
            )
        active_other = self.striker_id or self.non_striker_id
        if new_batter_id == active_other:
            raise CreaseViolationError(
                f"Player {new_batter_id} is already at the crease"
            )

        if self.striker_id is None:
            self.striker_id = new_batter_id
        else:
            self.non_striker_id = new_batter_id
        self.awaiting_new_batter = False
