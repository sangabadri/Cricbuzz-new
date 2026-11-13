# Worked examples

Illustrative. Names of files are real; the features are made up to show the process. Check the code before relying on details.

---
## Example 1: Small task

**Request:** "A match venue made only of spaces should be rejected."

**Brief (small version)**
- Goal: venue that is empty or only spaces is rejected with a clear message.
- Must not change: any valid venue; other fields.
- How we know it works:
  - [ ] Venue `"Wankhede"` is accepted (as before).
  - [ ] Venue `"   "` is rejected with 422 (shape check) or 400 (rule), whichever the existing validation style uses.

**Steps taken**
1. Read `schemas/match.py` and how other text fields are validated (copy that style).
2. Add the test for `"   "` first (it fails). Add one for a normal venue (passes).
3. Add the smallest validation.
4. Run the matching test file, then `pytest`.
5. Diff: only `schemas/match.py` and one test file changed.
6. Report: 2 files, tests run, no open questions.

**What the agent must NOT do:** add a new validation helper layer, reformat the file, or "also" fix other schemas.

---
## Example 2: Medium feature

**Request:** "Add a Players page: list all players with a search box."

**Brief**
- Goal: a page listing players, filtered by typing a name.
- In: list + search. Out: editing, deleting, player detail.
- Must do: show name and role; filter as the person types; show a message when nothing matches.
- How we know it works:
  - [ ] Opening the page shows all players.
  - [ ] Typing "kohli" shows only matching players.
  - [ ] No match -> "No players found".
  - [ ] Backend error -> a readable message.
  - [ ] Page works at phone width.
- Open question: is search done in the browser or the backend? (Human: browser; the list is small.)

**Explore:** traced how teams are listed (router -> service -> repo) and how `Home.tsx` loads and shows matches.
The backend already has a list-players endpoint, so this is frontend-only. (If it had not, a backend task would come first.)

**Design plan (summary)**
- Type: reuse `Player` in `types/cricket.ts`.
- API: reuse `cricketApi` player list function.
- Hook: `features/players/hooks/usePlayers.ts` (query).
- Components: `PlayerList`, `PlayerSearchBox` (props in, callbacks out).
- Page: `features/players/pages/PlayersPage.tsx`; route `/players`.
- Not added: global state, new library, new endpoint.
- Approved: yes.

**Build steps (each tested + committed)**
1. Hook + hook test (loading, data, error).
2. `PlayerList` + test (rows, empty message).
3. `PlayerSearchBox` + test (typing calls `onChange`).
4. Page + test (type "kohli" -> only matching row).
5. Route. Navbar link (shared file, edited last).

**Checks:** lint, tests, build, look at it with data / no data / backend off.

---
## Example 3: Large feature

**Request:** "Show player career statistics across all matches."

**Why large:** needs a new calculation over many tables, a new endpoint, a new screen, and unclear rules (are wickets from abandoned matches counted?).

**Phase 1: Understand**
- Open questions for the human: which matches count (completed only?), which numbers (runs, balls, 4s, 6s, wickets, average, strike rate)?
  How is "average" computed when a player was never out? Is a shown number allowed to be slow to load?
- Explore: how a scorecard is built (`services/scorecard.py`) and which deliveries tables exist.
- Design plan options: A) compute from deliveries when asked; B) store totals in a new table.
  Recommended: A (no new table; fewer things to keep in sync). New table = Stop and ask, so A is also easier to approve.
- Decision record: `0007-player-stats-computed-on-request.md`.

**Phase 2: Contracts**
- API: `GET /api/v1/players/{player_id}/stats` -> `{ matches, runs, balls_faced, fours, sixes, wickets, ... }`.
  Errors: 404 if player unknown. Empty stats (all zeros) if the player has not played.
- Frontend type `PlayerStats` matches this exactly.

**Phase 3: Work split**
| Job | Owns | Needs first | Done when |
|---|---|---|---|
| B1 Backend: stats query + service + endpoint | `repositories/player.py` (stats method), `services/player_stats.py`, `routers/players.py`, `schemas/player.py` | Contract | Unit + e2e tests pass |
| F1 Frontend: stats card on a player page | `features/players/**` | Contract (can use fake data) | Component + page tests pass |
| T1 Independent tests from requirements | `tests/e2e/test_player_stats.py` | Contract + rules | Tests exist before B1 is reviewed |
Shared files (`deps.py`, `api.py`, `types/cricket.ts`, `app/router.tsx`): lead edits after jobs finish.
B1 and F1 run in parallel. T1 is written by a different agent than B1, from the requirement.

**Phase 4: Build and join**
- B1 done -> lead merges -> `pytest`. F1 switches from fake data to the real endpoint -> lead merges -> frontend checks.

**Surprise:** B1 finds that some old deliveries have no striker id. This changes what "balls faced" means.
B1 stops, reports, offers two options. Human decides. Contract and `domain/cricket-rules.md` updated. Work continues.

**Phase 5: Verify**
Numbers from the new endpoint are compared with a scorecard of one known match checked by hand. Second agent reviews diff against
the brief. Edge cases: player with no matches, abandoned match, player who was never out.

**Phase 6: Keep**
Decision record added, rules page updated, `known-problems.md` updated if something was left, session notes if unfinished.
