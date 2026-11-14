# Product Requirements & Acceptance Criteria

This document defines the functional and non-functional requirements for Cricbuzz Tracker. Every requirement is identifiable and written to support requirement-driven testing.

---

## 1. Functional Requirements

### FR-1: Team and Player Management
- **FR-1.1**: The system must allow creating teams with unique names, short names (2–4 characters), and primary/secondary team colors.
- **FR-1.2**: The system must allow creating player profiles with unique names within a team, specified roles (`batsman`, `bowler`, `all-rounder`, `wicketkeeper`), batting styles, and bowling styles.
- **FR-1.3**: Team names and short codes must not be empty or whitespace-only.

### FR-2: Match Setup and Squad Selection
- **FR-2.1**: A match must be created between two distinct teams (`team_a != team_b`) with a specified format (`t20` or `odi`), venue, scheduled start time, and overs.
- **FR-2.2**: The match format determines default over limits (T20 = 20 overs, max 4 overs/bowler; ODI = 50 overs, max 10 overs/bowler).
- **FR-2.3**: Squad submission for a match requires exactly 11 players in the Playing XI.
- **FR-2.4**: Squad submission must designate exactly one Captain and exactly one Wicketkeeper, both of whom must be members of the Playing XI.
- **FR-2.5**: A player cannot be registered in both competing teams for the same match.
- **FR-2.6**: Toss recording requires the toss winner (must be Team A or Team B) and toss decision (`bat` or `bowl`).
- **FR-2.7**: Toss recording transitions match status from `scheduled` to `toss_done`.

### FR-3: Innings Management & Transition
- **FR-3.1**: Innings 1 can be started once toss is recorded, setting match status to `live` and innings status to `in_progress`.
- **FR-3.2**: Starting an innings requires selecting the batting team, bowling team, opening striker, opening non-striker, and opening bowler.
- **FR-3.3**: Opening striker and non-striker must be distinct players belonging to the batting team's Playing XI.
- **FR-3.4**: Opening bowler must belong to the bowling team's Playing XI.
- **FR-3.5**: Innings 1 completes when:
  1. The batting team is all out (10 wickets fallen).
  2. The maximum overs for the format have been legally completed.
- **FR-3.6**: When Innings 1 completes, match status transitions to `innings_break`.
- **FR-3.7**: Innings 2 starts with opposite teams batting and bowling, with a target score set to `Innings 1 Total Runs + 1`.
- **FR-3.8**: Match completes when:
  1. Innings 2 batting team reaches or exceeds the target (Batting team wins by X wickets).
  2. Innings 2 is all out or overs expire with score < target (Bowling team wins by X runs).
  3. Innings 2 overs expire with score == target - 1 (Match tied).
- **FR-3.9**: Upon match completion, match status transitions to `completed` with calculated winner and result summary.

### FR-4: Live Ball-by-Ball Scoring & Crease Invariants
- **FR-4.1**: Each delivery records: ball number in over, over number, bowler ID, striker ID, non-striker ID, runs off bat (0–6), extra type (if any), extra runs, wicket type (if any), player dismissed (if any).
- **FR-4.2**: Legal deliveries increment the over ball count (`0.1`, `0.2`, ... `0.6` -> over complete).
- **FR-4.3**: Wides and No-balls add +1 penalty run and do NOT increment legal ball count (re-bowled).
- **FR-4.4**: Byes and Leg-byes increment legal ball count, and runs are credited to team extras, not the batter.
- **FR-4.5**: Strike rotation occurs when:
  1. An odd number of runs (1, 3) is scored off the bat or as byes/leg-byes.
  2. The over completes (legal ball 6), switching striker and non-striker for the next over.
- **FR-4.6**: Bowler quota validation: A bowler cannot exceed format max overs. A bowler cannot bowl two consecutive overs from the same end.
- **FR-4.7**: Wicket resolution:
  - If striker is dismissed, a new batter must be assigned before the next ball can be recorded.
  - If a run-out occurs, the dismissed player can be either striker or non-striker.
  - Dismissed players cannot return to the crease in the same innings.

### FR-5: Undo and Last-Ball Correction
- **FR-5.1**: The scorer must be able to undo the most recent delivery in the current innings.
- **FR-5.2**: Undoing a delivery must accurately revert:
  1. Crease state (striker, non-striker, bowler).
  2. Total runs, extras, and wickets count.
  3. Batter and bowler individual stats (runs, balls, wickets).
  4. Match completion status if the undone delivery ended the match.
- **FR-5.3**: Consecutive undos must be supported back to the beginning of the innings.
- **FR-5.4**: Updating the last delivery (correction) must atomically recalculate the entire innings state.

### FR-6: Match Center & Public Scorecards
- **FR-6.1**: Spectators can view live match cards with real-time score, run rates, and recent balls.
- **FR-6.2**: Detailed scorecard must show:
  - Batting table: Batter, dismissal info, runs, balls, 4s, 6s, strike rate (`(runs / balls) * 100`).
  - Extras breakdown: Byes, leg-byes, wides, no-balls, penalty runs.
  - Total: Runs/Wickets (Overs).
  - Bowling table: Bowler, overs, maidens, runs conceded, wickets taken, economy rate (`runs / (overs + balls/6)`).
- **FR-6.3**: Commentary tab displays reverse-chronological ball-by-ball updates.
- **FR-6.4**: Squads tab displays Playing XI, reserves, captain, and wicketkeeper for both teams.

### FR-7: Authentication & Session Management
- **FR-7.1**: Users can register with username and password, and log in to obtain JWT access tokens.
- **FR-7.2**: Access tokens have a short lifetime (e.g. 15 minutes) and are sent in the Authorization header.
- **FR-7.3**: Refresh tokens are stored exclusively in `httpOnly`, `SameSite=Lax`, `Path=/api/v1/auth` cookies.
- **FR-7.4**: Refresh token requests perform cryptographic rotation, invalidating the old token.
- **FR-7.5**: Token reuse attack detection: Replaying a revoked refresh token immediately invalidates all active sessions for that user.
- **FR-7.6**: Logging out invalidates the session in the database and clears the browser cookie.

### FR-8: Match Authorization & Multi-Scorer Access
- **FR-8.1**: Match ownership resides canonically in `match_access` table with `role = owner`.
- **FR-8.2**: Match owners can grant `scorer` or `viewer` roles to other registered users.
- **FR-8.3**: Only users with `owner` or `scorer` roles (or superusers) are authorized to submit squads, start innings, or record deliveries.
- **FR-8.4**: Unassigned/legacy matches (no entries in `match_access`) permit open access for testing/demo compatibility.
- **FR-8.5**: Spectator read-only endpoints (`GET /matches`, `GET /matches/{id}`, `GET /matches/{id}/scorecard`) are completely unauthenticated.

---

## 2. Non-Functional Requirements (NFR)

### NFR-1: Consistency & Atomicity
- **NFR-1.1**: Every scoring request must execute in a single database transaction (`get_db()` commit-on-success, rollback-on-error).
- **NFR-1.2**: Scoring mutations must enforce deterministic row-locking: lock `Match` first, then `Innings` (`SELECT ... FOR UPDATE`), preventing deadlocks under concurrent requests (ADR-0003).

### NFR-2: Domain Isolation
- **NFR-2.1**: The core cricket domain logic (`backend/app/domain`) must have zero dependencies on web or persistence frameworks (no FastAPI, SQLAlchemy, or Pydantic imports). This is enforced mechanically by automated architectural tests (ADR-0001).

### NFR-3: Scorer Ergonomics & Mobile Usability
- **NFR-3.1**: Scorer console controls (keypad, undo, ball entry) must have touch target heights >= 44px to support thumb scoring on mobile devices.
- **NFR-3.2**: UI state transitions must handle loading, empty, and error states gracefully without full-screen crashes.

### NFR-4: Performance & Latency
- **NFR-4.1**: Ball recording endpoint response time must be under 200ms on standard hardware.
- **NFR-4.2**: Match authorization checks must resolve in a single index-seek query (`MatchAccessRepository.get_match_auth_context()`) to avoid N+1 overhead during ball-by-ball scoring.
