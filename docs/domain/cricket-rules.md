# Cricket rules in this app (plain words)

These are rules the code enforces today. They were read from the code on 2026-11-12.
**Code and tests are the truth.** If you find a mismatch, report it, do not decide alone.
If a task needs a rule that is not here and is unclear, stop and ask.

## Vocabulary used by the code
- Match status: scheduled, toss_done, live, innings_break, completed, abandoned
- Innings status: not_started, in_progress, completed
- Formats: t20, odi
- Toss decision: bat, bowl
- Roles: batsman, bowler, all-rounder, wicketkeeper
- Wicket types: bowled, caught, lbw, run_out, stumped, hit_wicket
- Extra types: wide, noball, bye, leg-bye

## Squads (`SquadService.create_squad`)
- The match must exist.
- The team must be one of the two teams in that match.
- A team can submit one squad per match.
- No player appears twice in a squad.
- A player cannot be in both teams' squads for the same match.
- Playing XI has exactly 11 players.
- Captain and wicketkeeper must both be in the Playing XI.

## Crease (`domain/crease.py`)
- Striker and non-striker must be different players.
- A dismissed player cannot be put back on the crease.
- After a wicket, the match waits for a new batter before play continues.
- Strike changes at the end of an over.

## Scoring
Ball-by-ball rules (extras, wickets, over progression, bowler limits, last-ball correction and undo)
live in `backend/app/domain/innings_aggregate.py` and `backend/app/domain/rules/`.
Add each rule here in one plain line when you next touch that code and confirm it with the human.

## Open rule questions (answer once, then move the rule above)
- When a last ball is corrected, which striker / bowler state is restored? (Requirement must be stated
  by the human. The agent must not invent it.)
