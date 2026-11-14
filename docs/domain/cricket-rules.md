# Cricket Rules in This App (Plain Words)

These rules are enforced by the application codebase.
**Code and automated tests are the final truth.** If you find a discrepancy, report it rather than assuming either side is correct. If a task requires a rule not documented here, stop and ask.

For formal entity models, mathematical formulas, and aggregate state machines, see **[`docs/domain/domain-model.md`](domain-model.md)**.

---

## 1. Domain Vocabulary

- **Match Status**: `scheduled`, `toss_done`, `live`, `innings_break`, `completed`, `abandoned`.
- **Innings Status**: `not_started`, `in_progress`, `completed`.
- **Formats**: `t20` (20 overs, max 4 overs/bowler), `odi` (50 overs, max 10 overs/bowler).
- **Toss Decision**: `bat`, `bowl`.
- **Player Roles**: `batsman`, `bowler`, `all-rounder`, `wicketkeeper`.
- **Wicket Types**: `bowled`, `caught`, `lbw`, `run_out`, `stumped`, `hit_wicket`.
- **Extra Types**: `wide`, `noball`, `bye`, `leg-bye`.
- **Match User Roles**: `owner`, `scorer`, `viewer`.

---

## 2. Squad Invariants (`SquadService.create_squad`)

- The match must exist.
- The team submitting the squad must be Team A or Team B in that match.
- Each team may submit exactly one squad per match.
- Playing XI must contain **exactly 11 unique players**.
- No player may appear twice in a squad.
- A player cannot be registered in both competing squads for the same match.
- Both the **Captain** and **Wicketkeeper** must be in the Playing XI.

---

## 3. Crease Invariants (`backend/app/domain/crease.py`)

- Striker and non-striker must always be distinct players.
- A dismissed batter cannot return to the crease in the same innings.
- When a wicket falls, play halts (`is_waiting_for_batter = True`) until a new batter from the Playing XI is assigned to the crease.
- **Strike Rotation**:
  - Odd runs (1, 3) off bat or via byes/leg-byes swap the striker and non-striker ends.
  - At the end of an over (legal ball 6), striker and non-striker ends swap.
  - If a wicket falls on ball 6 without an immediate incoming batter, the surviving batter and the vacant crease spot swap ends; upon assigning the incoming batter, the surviving batter is on strike for the new over.
- **Innings Completion Reset**:
  - Reaching innings completion (all-out, format overs exhausted, or target reached) immediately clears `awaiting_new_batter = False`.
- **Bowler Rotation**:
  - The bowler for the new over cannot be the bowler who bowled the preceding over.
  - A bowler cannot exceed format quotas (T20: 4 overs; ODI: 10 overs).

---

## 4. Ball-by-Ball Scoring Laws (`InningsAggregate`)

- **Legal Deliveries**: Increment over legal ball count (0.1 through 0.6). Runs off the bat are credited to the batter's personal score and the team total.
- **Wide**: Adds +1 penalty run (credited to bowler extras and team total). Does **not** count as a legal ball (re-bowled).
- **No-ball**: Adds +1 penalty run (credited to bowler extras and team total). Does **not** count as a legal ball (re-bowled). Any runs hit off the bat are credited to the batter.
- **Byes & Leg-byes**: Count as legal balls. Runs taken are credited to team extras, not to the batter.
- **Wickets & Dead Ball Rule**:
  - Bowled, Caught, LBW, Stumped, Hit Wicket: Dismisses the striker; credited to the bowler. The ball becomes dead immediately at the fall of wicket; **runs off the bat are strictly forbidden** (`runs == 0`).
  - Run Out: Can dismiss either striker or non-striker; not credited to the bowler. Completed runs off the bat or extras before the run out are permitted.
- **Innings Transitions**:
  - Innings 1 completes when 10 wickets fall OR format overs expire.
  - Innings 2 completes when the batting team reaches the target score (Target = Innings 1 Runs + 1) OR when 10 wickets fall / overs expire.

---

## 5. Match Lifecycle & Access Invariants

- **Innings Creation Guards**:
  - Innings cannot be created for a match whose status is `completed` or `abandoned`.
  - Innings count cannot exceed format maximum (e.g. max 2 innings for T20 and ODI).
- **Sole Owner Protection**:
  - A match's sole owner cannot be demoted to `scorer` or `viewer`, nor can their access be revoked without transferring ownership first.
