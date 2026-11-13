# Backend testing

Run: `pytest` inside `backend/` (`pytest.ini` sets `tests/` and the import path).

## Kinds of tests
| Kind | Where | Uses | Good for |
|---|---|---|---|
| Domain unit | `tests/unit/domain/` | Plain objects | Cricket rules, crease, innings math |
| Service unit | `tests/unit/test_*_service.py` | `AsyncMock` repositories | Every rejection and success path of a service |
| Architecture | `tests/unit/test_architecture.py` | Reads source files | Domain stays free of framework imports |
| Request-path (e2e) | `tests/e2e/` | In-process app, SQLite in memory (`AsgiTestClient` in `conftest.py`) | Status codes, JSON, effects across layers |

## Rules
1. Tests come from the requirement. Do not copy the code's logic into the test.
2. Each requirement line: at least one test. Each rejection rule: one test that proves it is rejected.
3. Check the effect after an action (create, then read; revoke, then try again), not only the action's response.
4. Existing behaviour stays tested. A change that breaks an old test needs a human decision.
5. Keep tests small: one idea each. Name: `test_<what_should_happen>`.
6. Do not weaken or delete a test to pass.

## Use the helpers that exist
`sync` (runs async tests without an event loop), `AsgiTestClient`, fixtures in `tests/conftest.py`.
There are two copies of `sync` (conftest and `test_squad_service.py`). When adding a test, import from
`conftest` or reuse the existing fixture. Do not write a third copy.

## When a lot depends on it, test the odd cases
Empty values, duplicates, wrong match state, repeated requests, two requests at once, undo after undo,
a correction right after a wicket.

## Before accepting
Run the whole suite on the final code. A passing count is not proof by itself: look at what is
missing (is every requirement line covered?).
