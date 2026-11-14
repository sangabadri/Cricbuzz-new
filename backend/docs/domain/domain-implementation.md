# Domain Implementation

This document describes how pure cricket domain logic, aggregates, crease state machines, and format rules are implemented in `backend/app/domain/`.

---

## 1. Domain Structure & Zero-Framework Constraint

The domain package contains pure Python business logic:

```text
backend/app/domain/
├── __init__.py
├── enums.py                # MatchFormat, MatchStatus, WicketType, ExtraType, Role, Batting/Bowling styles
├── exceptions.py           # CricketDomainError hierarchy (zero HTTP knowledge)
├── crease.py               # CreaseState: batting crease state machine
├── innings_aggregate.py    # InningsAggregate: ball-by-ball score and over progression
└── rules/
    ├── __init__.py
    └── formats.py          # MatchFormatRules, T20FormatRules, ODIFormatRules
```

**Constraint (ADR-0001)**: The domain layer has zero knowledge of databases, web frameworks, or serialization libraries. AST inspection in `tests/unit/test_architecture.py` continuously enforces this. In accordance with ADR-0001 and ADR-0008 (Single-Owner Match Model), authentication concepts, access control lists, and match roles are strictly forbidden in `backend/app/domain/enums.py`.

---

## 2. Crease State Machine (`CreaseState` in `app/domain/crease.py`)

The `CreaseState` class models the players currently at the batting crease:

```python
class CreaseState:
    def __init__(self, striker_id: int, non_striker_id: int, current_bowler_id: int):
        if striker_id == non_striker_id:
            raise CreaseViolationError("Striker and non-striker must be different players")
        self.striker_id = striker_id
        self.non_striker_id = non_striker_id
        self.current_bowler_id = current_bowler_id
        self.dismissed_player_ids: set[int] = set()
        self.is_waiting_for_batter: bool = False
```

### Core Crease Operations:
- `rotate_strike_at_over_end()`: Swaps striker and non-striker ends at the completion of an over. If a wicket fell on ball 6, swaps the surviving batter with the vacant end so the surviving batter faces the next over when incoming batter is assigned.
- `assign_incoming_batter(new_batter_id: int)`: Fills the vacant crease slot after a dismissal. Raises `CreaseViolationError` if `new_batter_id` is already on the crease or was previously dismissed.
- `rotate_strike()`: Swaps striker and non-striker on odd runs (1, 3, 5).
- `handle_dismissal(player_out_id: int)`: Clears the dismissed batter slot and sets `awaiting_new_batter = True`.

---

## 3. Innings Aggregate (`InningsAggregate` in `app/domain/innings_aggregate.py`)

The `InningsAggregate` encapsulates an entire innings' scoring state:

### State Maintained:
- `total_runs`: Total score of the batting team.
- `wickets`: Total dismissals (0–10).
- `completed_overs`: Number of full 6-ball overs bowled.
- `balls_in_current_over`: Legal deliveries bowled in the active over (0–5).
- `extras`: Detailed breakdown (`wides`, `noballs`, `byes`, `legbyes`, `penalty`).
- `batter_stats`: Map of `player_id -> BatterStats(runs, balls_faced, fours, sixes, is_out)`.
- `bowler_stats`: Map of `player_id -> BowlerStats(overs, balls, maidens, runs, wickets)`.

### Delivery Processing (`record_ball`):
1. **Validation (`validate_delivery_state`)**:
   - Confirms match and innings are in progress.
   - Prohibits runs off the bat (`runs > 0`) on direct dismissals (Bowled, Caught, LBW, Stumped, Hit Wicket).
   - Validates bowler quotas and consecutive over limits.
2. **Crease and Strike Resolution (`_apply_crease_and_strike_events`)**:
   - Physical running runs: evaluates extras for Bye/Leg-bye or bat runs.
   - On dismissal: increments total wickets and triggers `crease.handle_dismissal`.
   - On non-wicket scoring: updates strike rotation via `crease.handle_runs`.
3. **Over and Counter Progression (`_advance_ball_and_over_counters`)**:
   - Legal balls: increments `current_ball_in_over` and `total_legal_balls`.
   - Over completion: when legal balls reach format limit (`format_rules.balls_per_over`), rotates strike at over end, tallies bowler overs, and advances over counter.
   - Evaluates terminal conditions via `_check_innings_completion`.

### Reconstructing Aggregate State (`reconstruct`):
The aggregate is reconstructed deterministically from persisted deliveries using two dedicated helpers:
- `_replay_single_delivery`: Replays each historical ball's runs, extras, wickets, crease alignment, and over progression.
- `_rehydrate_crease_state`: Applies persistent database crease overrides and resolves `awaiting_new_batter` status.
This guarantees auditability and powers the **Undo** and **Correction** features without duplicating parsing logic.

---

## 4. Match Format Strategy (`MatchFormatRules` in `app/domain/rules/formats.py`)

Format limits are implemented via strategy subclasses:
- `T20FormatRules`: `max_overs = 20`, `max_bowler_overs = 4`.
- `ODIFormatRules`: `max_overs = 50`, `max_bowler_overs = 10`.

Factory function `get_format_rules(format_str)` instantiates the correct strategy.
