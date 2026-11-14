# Product Overview

## 1. Application Vision & Purpose
**Cricbuzz Tracker** is a real-time cricket match tracking, live scoring, and spectator match center application. It provides instant ball-by-ball scoring for scorers and tournament administrators while offering a live, responsive scoreboard, commentary feed, and detailed scorecard for spectators.

The system is built to balance two fundamental needs:
1. **Scorer Ergonomics & Accuracy**: Fast, error-resilient scoring console supporting touch input, ball-by-ball undo/correction, strict crease state management, and real-time validation against official cricket laws.
2. **Spectator Accessibility**: Frictionless, unauthenticated access to live matches, full scorecards, and historical fixtures with low latency.

---

## 2. Target Users & Personas

| Persona | Primary Needs & Goals | Core Workflows | Authentication |
|---|---|---|---|
| **Public Spectator** | Follow live matches, browse past fixtures, inspect detailed batter/bowler scorecards, and read ball commentary. | View match list, filter by status (Live, Scheduled, Completed), inspect match center tabs. | **Unauthenticated** (Strictly public, ADR-0005) |
| **Match Scorer / Creator** | Fast ball recording, strike changes, extras, dismissals, bowler rotation, undo last ball, and innings transitions. | Open Scorer Console, manage active striker/non-striker/bowler, record deliveries, resolve wickets. | **Authenticated** (Match Owner via `matches.owner_id`, ADR-0008) |
| **Tournament Admin** | Schedule new matches, register teams and players, set up Playing XIs, manage toss. | Setup Wizard, Dashboard management, Toss manager, Squad submission. | **Authenticated** (Match Owner or Superuser) |

---

## 3. System Capabilities

### A. Team, Player, and Match Setup
- Register international and club teams with brand colors.
- Register player profiles with batting styles, bowling styles, and roles.
- Schedule matches with format selection (`t20`, `odi`), venue, date/time, and overs.
- Squad selection enforcing exact 11-player Playing XI, captain designation, and wicketkeeper validation.
- Toss management (toss winner, decision to bat or bowl).

### B. Live Ball-by-Ball Scoring Engine
- Active crease tracking (striker, non-striker, bowler).
- Legal runs (0, 1, 2, 3, 4, 6).
- Extras calculation:
  - Penalty runs with re-bowled delivery: **Wide** (+1 run, extra ball), **No-ball** (+1 run, extra ball).
  - Non-penalty extras: **Bye**, **Leg-bye** (credited to team extras, not bowler).
- Dismissal resolution: Bowled, Caught, LBW, Run Out, Stumped, Hit Wicket.
- Automatic strike rotation on odd runs (1, 3) and end of over (except between overs).
- Bowler quota enforcement (T20 max 4 overs/bowler, ODI max 10 overs/bowler; consecutive overs by same bowler prohibited).
- Instant **Undo** and **Last-Ball Correction** to recover from scorer human error.

### C. Live Match Center & Scorecard Generation
- Real-time live summary (total score, current run rate, required run rate, target).
- Decomposed tabular scorecards (Batting table with runs, balls, 4s, 6s, strike rates; Bowling table with overs, maidens, runs, wickets, economy).
- Fall of Wickets (FoW) progression.
- Reverse-chronological commentary feed with ball tags.

### D. Security & Access Control
- Cookie-based session management (`httpOnly`, `SameSite=Lax` refresh tokens) with cryptographically secure token rotation.
- Single-Owner Match Model stored directly on `matches.owner_id` (ADR-0008). A match belongs strictly to one user with no multi-user role delegation.
- Explicit fail-closed authorization guards protecting scoring endpoints.
- Unconditional public access to all read-only spectator views.

---

## 4. System Boundaries & Explicit Non-Goals

### Inside System Boundaries
- T20 and ODI match format execution.
- Single-match scoring and live distribution.
- Role-based permissions per match.
- Responsive mobile web interface for scoring and viewing.

### Outside System Boundaries (Non-Goals)
- Multi-day Test cricket formats (Declaration, Follow-on).
- Automated DLS (Duckworth-Lewis-Stern) target recalculation for rain interruptions.
- Native mobile app wrappers (iOS/Android store builds).
- Real-time WebSocket clustering (the frontend currently uses TanStack Query interval polling).
- Payment gateways, ticketing, or third-party cricket federation integrations.
