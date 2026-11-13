# 0001: Backend layers and the pure domain

- Status: Accepted
- Date: 2026-11-12

## Situation
Cricket rules (crease, overs, wickets, innings) are the heart of the app. They must be testable
without a web server or a database.

## Decision
Backend code is split into layers. Calls go downward only.

`routers -> services -> repositories -> models`
`services -> domain` (domain is pure rules)
`schemas` describe request and response shapes.

- `domain/`: plain Python. Imports no FastAPI, SQLAlchemy or Pydantic.
  An automatic test enforces this (`backend/tests/unit/test_architecture.py`).
- `services/`: business flow. Raises domain errors. No HTTP.
- `repositories/`: database queries only.
- `routers/`: read request, call a service, return response.
- `api/deps.py`: builds services with their repositories for each request.

## Other options considered
- Put rules in routers: quick, but rules cannot be tested alone and get copied.
- More layers (interfaces, factories): no real problem here needs them yet.

## Results
Good: rules are testable alone; each layer has one job.
Costs: a small change can touch several files. Wiring lives in `deps.py`.
Watch: some services are very long (see `backend/docs/known-problems.md`).
