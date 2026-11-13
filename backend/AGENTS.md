# Backend rules

Python 3.11, FastAPI, async SQLAlchemy, PostgreSQL, Pydantic v2, pytest.
Read `/AGENTS.md` first. This file adds the backend rules.

## Layers (calls go down only)
```
routers  ->  services  ->  repositories  ->  models
                 |
                 v
              domain   (pure cricket rules)
schemas = request / response shapes      api/deps.py = builds services per request
```
| Layer | Does | Never does |
|---|---|---|
| `routers/` | Read the request, call ONE service method, return the result | Rules, database calls, loops over data |
| `services/` | Business flow and rules, raises domain errors | Import FastAPI / HTTPException, write SQL |
| `repositories/` | Database queries (`select`, `add`, `flush`) | Business rules, commit, raise HTTP errors |
| `domain/` | Pure cricket rules and state | Import fastapi, sqlalchemy or pydantic (a test checks this) |
| `models/` | Table definitions | Logic |
| `schemas/` | Pydantic request and response shapes | Logic, database access |
| `api/deps.py` | Wire repositories into services | Rules |

Details and code patterns: `docs/layers-and-rules.md`, `docs/code-patterns.md`.

## Naming (one pattern, copy it)
- One file per thing, singular, in each layer: `team.py`, `squad.py`, `delivery.py`.
- Classes: `TeamService`, `TeamRepository`, `Team` (model).
- Schemas: `TeamCreate` (input), `TeamUpdate` (change), `TeamResponse` (output).
- Functions: verbs, plain English: `create_squad`, `get_by_match_and_team`, `undo_last_delivery`.
- Errors: end with `Error`. Tests: `test_<what_should_happen>`.
- Use simple, clear words. Prefer `player_id` to clever abbreviations.

## Size limits
- Function: aim for 40 lines. Over 80 is a problem.
- File: aim for 300 lines.
- **Do not make an existing long function longer.** Several are already too long
  (`docs/known-problems.md`). If your task must change one, first propose extracting small helper
  methods, as a separate step with tests passing before and after.

## Errors
Raise errors from `app/domain/exceptions.py`. Add a new error type only when needed, and add it to
`DOMAIN_EXCEPTION_STATUS_MAP` in `app/main.py` with a test. Messages must make sense to a person.

## Database
- All database code is `async` / `await`.
- Repositories use `flush`. Only `get_db()` commits (one transaction per request).
- Methods that change match or innings state lock rows in the order **match, then innings** (`for_update=True`).
- A new table or column is Stop-and-ask. `create_all` does not alter existing tables.

## Tests (`docs/testing.md`)
- Every line of "How we know it works" has a test.
- Rules: unit test in `tests/unit/` (mock repositories). Whole request path: `tests/e2e/`.
- Write at least one test for a case that should be rejected, not only the happy path.
- Never edit or delete a test to make it pass. If a test looks wrong, report it.

## Do not
- Expand auth/permissions or replicate patterns from deps.py without an approved design (decision 0005).
- Put rules in routers. Put database calls in services.
- Add a new layer, base class, interface or manager "for the future".
- Add a library without approval.
- Change an API path, field name or status code without approval (the frontend depends on it).

## Adding something new
Follow `docs/adding-a-feature.md`. Good models to copy:
| For | Copy from |
|---|---|
| Router | `app/routers/deliveries.py`, `app/routers/teams.py` |
| Service | `app/services/squad.py` |
| Repository | `app/repositories/squad.py` |
| Schema | `app/schemas/squad.py` |
| Pure rules | `app/domain/crease.py` |
| Wiring | `app/api/deps.py` |
| Layer test | `tests/unit/test_architecture.py` |
| Service unit test | `tests/unit/test_squad_service.py` |
| Request-path test | `tests/e2e/test_match_lifecycle_e2e.py` |

Run: `pytest` inside `backend/`.
