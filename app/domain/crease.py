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
    ):
        self.striker_id: int | None = striker_id
        self.non_striker_id: int | None = non_striker_id
        self.dismissed_player_ids: list[int] = list(dismissed_player_ids or [])

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

    def set_active_batters(self, striker_id: int, non_striker_id: int) -> None:
        """Updates the active batters at the crease, ensuring valid state."""
        self._validate_distinct_batters(striker_id, non_striker_id)
        if striker_id in self.dismissed_player_ids:
            raise CreaseViolationError(f"Striker (Player {striker_id}) has already been dismissed")
        if non_striker_id in self.dismissed_player_ids:
            raise CreaseViolationError(f"Non-striker (Player {non_striker_id}) has already been dismissed")
        self.striker_id = striker_id
        self.non_striker_id = non_striker_id

    def rotate_strike(self) -> None:
        """Swaps striker and non-striker ends."""
        self.striker_id, self.non_striker_id = self.non_striker_id, self.striker_id

    def rotate_strike_at_over_end(self) -> None:
        """Called at the conclusion of an over to swap ends."""
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
        Enforces dismissal rules, marks player as dismissed, and introduces a new batter.
        - Non-rebatting rule: A dismissed player cannot bat again.
        - Non-striker dismissal: Can only be run out.
        - Striker dismissal: Can be bowled, caught, lbw, stumped, hit wicket, run out, etc.
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

        # Enforce non-rebatting rule for incoming batter
        if new_batter_id is not None:
            if new_batter_id in self.dismissed_player_ids or new_batter_id == out_player_id:
                raise CreaseViolationError(
                    f"Player {new_batter_id} has already been dismissed and cannot bat again."
                )
            remaining_batter = self.non_striker_id if out_player_id == self.striker_id else self.striker_id
            if new_batter_id == remaining_batter:
                raise CreaseViolationError(
                    f"Player {new_batter_id} is already at the crease as the other batter."
                )

        # Mark player out
        self.dismissed_player_ids.append(out_player_id)

        # Replace dismissed player with incoming batter
        if out_player_id == self.striker_id:
            self.striker_id = new_batter_id
        else:
            self.non_striker_id = new_batter_id

        # In modern MCC rules (effective 2022), incoming batter always takes strike on caught dismissals.
        # For run out with odd completed runs, batters might have crossed before the run-out:
        if crossed_runs % 2 != 0:
            self.rotate_strike()
