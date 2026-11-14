# Domain Model & Cricket Rules

This document describes the core domain concepts, entities, aggregates, state machines, business rules, and cricket laws enforced by Cricbuzz Tracker.

---

## 1. Domain Entities & Value Objects

```
+--------------------------------------------------------------------------------+
|                                DOMAIN MAP                                      |
|                                                                                |
|    +--------------------+              +--------------------+                  |
|    |        Team        | 1          * |       Player       |                  |
|    +--------------------+              +--------------------+                  |
|              | 2                                 |                             |
|              v                                   v                             |
|    +--------------------+              +--------------------+                  |
|    |       Match        | 1          * |       Squad        |                  |
|    | - format: T20/ODI  |              | - playing_xi (11)  |                  |
|    | - status           |              | - captain_id       |                  |
|    | - toss & result    |              | - keeper_id        |                  |
|    +--------------------+              +--------------------+                  |
|              | 1                                                               |
|              v 1..2                                                            |
|    +--------------------+              +--------------------+                  |
|    |      Innings       | 1          * |      Delivery      |                  |
|    | - batting_team_id  |              | - over, ball       |                  |
|    | - bowling_team_id  |              | - striker / bowler |                  |
|    | - total_runs, wkts |              | - runs, extras     |                  |
|    +--------------------+              | - wicket info      |                  |
|                                        +--------------------+                  |
+--------------------------------------------------------------------------------+
```

### A. Team
- Identifies a competing team (e.g. "India", "Australia", or club teams).
- Attributes: `name` (unique), `short_name` (2–4 chars, uppercase), `color_primary`, `color_secondary`.

### B. Player
- An athlete registered to a team.
- Attributes: `name`, `team_id`, `role` (`batsman`, `bowler`, `all-rounder`, `wicketkeeper`), `batting_style`, `bowling_style`.

### C. Match
- Aggregate representing the overall contest between two teams.
- Attributes: `team_a_id`, `team_b_id`, `format` (`t20`, `odi`), `status`, `venue`, `date_time`, `overs_limit`, `toss_winner_id`, `toss_decision`, `winner_id`, `result_margin`, `result_margin_type`.
- **Status Lifecycle**:
  `scheduled` -> `toss_done` -> `live` -> `innings_break` -> `live` (Innings 2) -> `completed` (or `abandoned`).

### D. Squad
- The team roster submitted for a specific match.
- **Invariants**:
  1. Must reference an existing match and a team participating in that match.
  2. Each team can submit at most one squad per match.
  3. Playing XI must contain **exactly 11 unique players**.
  4. Designates exactly one **Captain** and one **Wicketkeeper**, both of whom must be in the Playing XI.
  5. A player cannot be in both teams' squads for the same match.

### E. Innings
- One round of batting by a team. Standard matches have 2 innings.
- Attributes: `match_id`, `innings_number` (1 or 2), `batting_team_id`, `bowling_team_id`, `status` (`not_started`, `in_progress`, `completed`), `total_runs`, `wickets`, `overs` (float, e.g. 19.4), `target_runs` (Innings 2 only).

### F. Delivery
- The fundamental scoring atom: a single ball bowled.
- Attributes: `innings_id`, `over_number` (0-indexed), `ball_number` (1-indexed legal ball or extra), `bowler_id`, `striker_id`, `non_striker_id`, `runs_batter` (0–6), `extra_type` (`wide`, `noball`, `bye`, `leg-bye`), `extra_runs`, `is_wicket`, `wicket_type`, `dismissed_player_id`.

---

## 2. Crease State Machine (`CreaseState`)

The batting crease is governed by strict rules implemented in `backend/app/domain/crease.py`:

```
               [ Opening Batters Assigned ]
                            |
                            v
       +-----------------------------------------+
       |             Active Crease               |
       |  - striker: Player A                    |
       |  - non_striker: Player B                |
       |  - current_bowler: Bowler X             |
       +-----------------------------------------+
            |                  |              |
      Odd Runs (1, 3)     Over Complete    Wicket!
            |                  |              |
            v                  v              v
       [ Switch          [ Switch        [ Dismissal ]
        Striker &         Striker &           |
        Non-Striker ]     Non-Striker;        v
                          Change Bowler ] [ Assign New
                                            Batter ]
```

### Crease Invariants:
1. **Distinct Crease Occupants**: Striker and non-striker must always be different active players.
2. **Permanent Dismissal**: A batter dismissed in an innings cannot be reassigned to the crease in that same innings.
3. **Pending Batter State**: When a wicket falls, the crease enters a state requiring a new batter selection before any subsequent delivery can be recorded.
4. **Strike Rotation Rules**:
   - **Odd Runs (1, 3)** off bat or via byes/leg-byes: Striker and non-striker swap ends.
   - **Even Runs (0, 2, 4, 6)**: Batsmen stay at their respective ends.
   - **Over End**: After legal ball 6, striker and non-striker swap ends (unless a boundary on ball 6 or odd runs change positions, the end-of-over swap occurs afterward).
5. **Consecutive Bowler Restriction**: The bowler for the new over cannot be the same bowler who bowled the preceding over.

---

## 3. Innings Aggregate & Scoring Progression (`InningsAggregate`)

The `InningsAggregate` in `backend/app/domain/innings_aggregate.py` maintains mathematical and rule consistency across deliveries:

### A. Legal vs Extra Deliveries
| Delivery Kind | Legal Ball Counted? | Penalty Runs | Credited To |
|---|---|---|---|
| **Legal ball** | Yes (`+1` ball in over) | 0 | Runs off bat -> Batter score & Team total |
| **Wide** | **No** (ball re-bowled) | `+1` run (plus any runs taken) | Bowler extras & Team total |
| **No-ball** | **No** (ball re-bowled) | `+1` run (plus any runs taken) | Bowler extras & Team total (runs off bat to batter) |
| **Bye** | Yes (`+1` ball in over) | 0 penalty; runs taken | Team extras & Team total (0 runs to batter) |
| **Leg-bye** | Yes (`+1` ball in over) | 0 penalty; runs taken | Team extras & Team total (0 runs to batter) |

### B. Overs Representation
- An over consists of **6 legal deliveries**.
- Overs are stored as decimal balls: `0.1`, `0.2`, `0.3`, `0.4`, `0.5`, `1.0`.
- In mathematical calculations: `decimal_overs = completed_overs + (balls / 6.0)`.

### C. Wicket Types & Rules
- **Bowled, Caught, LBW, Stumped, Hit Wicket**: Dismisses the **striker**. Credited as a wicket to the **bowler**.
- **Run Out**: Can dismiss **either striker or non-striker**. **Not credited** to the bowler (team wicket only).

---

## 4. Match Format Strategies (`MatchFormatRules`)

Format rules follow the Strategy Pattern defined in `backend/app/domain/rules/formats.py`:

| Parameter | Twenty20 (`t20`) | One Day International (`odi`) |
|---|---|---|
| **Maximum Overs per Innings** | 20 overs | 50 overs |
| **Maximum Overs per Bowler** | 4 overs (`20 / 5`) | 10 overs (`50 / 5`) |
| **Maximum Wickets** | 10 wickets (all out) | 10 wickets (all out) |
| **Standard Total Innings** | 2 | 2 |
| **Balls per Over** | 6 | 6 |

---

## 5. Match Resolution Invariants

### Innings 1 Completion:
- Innings 1 completes when `wickets == 10` OR `legal_overs == max_overs`.
- Match enters `innings_break`.
- `target_runs = innings_1.total_runs + 1`.

### Innings 2 & Match Completion:
- **Batting Team Wins**: If `innings_2.total_runs >= target_runs`:
  - `winner = innings_2.batting_team`
  - `result_margin = 10 - innings_2.wickets`
  - `result_margin_type = "wickets"`
- **Bowling Team Wins**: If (`innings_2.wickets == 10` OR `innings_2.overs == max_overs`) AND `innings_2.total_runs < target_runs - 1`:
  - `winner = innings_2.bowling_team`
  - `result_margin = (target_runs - 1) - innings_2.total_runs`
  - `result_margin_type = "runs"`
- **Tie**: If (`innings_2.overs == max_overs` OR `innings_2.wickets == 10`) AND `innings_2.total_runs == target_runs - 1`:
  - `result_margin = 0`
  - `result_margin_type = "tie"`
