# Splitting work between agents

More agents do not mean faster. Use several only when the pieces are truly independent.

## One agent is enough when
- The task is small or medium.
- Steps depend on each other (the next step needs the previous result).
- The design is still changing.
- Two steps need to edit the same file.

## Several agents help when
- The contract (database + API + types) is approved and stable.
- Each agent owns different files.
- Joining the results is understood.
- Or the work is read-only (independent review, independent research).

## Patterns
| Pattern | Use it for |
|---|---|
| **Lead + helpers** (default) | A lead agent splits, gives each helper a bounded job, then joins and checks |
| **Chain** | Explore -> Design -> Build -> Test -> Review, each step needs the one before |
| **Side by side** | Independent audits, or backend and frontend after contracts are fixed |

Do not build a "manager of managers" for this project. It is too small for it.

## A good job for a helper includes
Goal, files it owns, files it may read, files it must not touch, the contract it follows,
what to deliver, which test proves it, what to do if it is blocked. Use `templates/work-split.md`.

Bad: "Implement the frontend."
Good: "Build `features/players/` using the API contract in the plan. Own only that folder and its
tests. Do not edit `lib/api-client.ts`. Done when these tests pass and lint is clean."

## Shared files
Typical shared files here: `backend/app/api/deps.py`, `backend/app/routers/api.py`, `backend/app/main.py`,
`frontend/src/types/cricket.ts`, `frontend/src/app/router.tsx`.
Rule: the lead edits shared files, one at a time, after helpers finish. Helpers ask the lead.

## Joining
The lead:
1. Merges one finished piece at a time.
2. Runs that part's tests after each merge.
3. Checks the pieces fit: field names, status codes, error messages, empty states.
4. Runs the whole suite, then the main user journey by hand.
Finished pieces that pass alone can still fail together.

## Surprise during the build
If a helper finds the contract is wrong (new relation needed, missing field):
the helper stops and reports. The lead pauses affected helpers, the human decides, the contract and
decision record are updated, then work continues. Nobody patches around it.
