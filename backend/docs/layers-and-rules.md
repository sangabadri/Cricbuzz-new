# Layers and rules in detail

## Why layers
Rules about cricket should be testable without a server or a database. Each layer has one job, so a
change has one obvious place.

## What each layer may import
| Layer | May import | Must not import |
|---|---|---|
| `domain` | other `domain` modules, standard library | `fastapi`, `sqlalchemy`, `pydantic`, `services`, `routers`, `models` |
| `schemas` | `domain` (enums), `pydantic` | `services`, `routers`, `repositories` |
| `models` | `sqlalchemy`, `models.base` | `services`, `routers` |
| `repositories` | `models`, `schemas` (for input shapes), `sqlalchemy` | `services`, `routers`, `fastapi` |
| `services` | `domain`, `models`, `repositories`, `schemas` | `fastapi`, `routers` |
| `routers` | `schemas`, `services`, `api.deps`, `fastapi`, `models` (type hints only) | `repositories`, `sqlalchemy` directly |

## Where does this rule go?
| It is... | Put it in |
|---|---|
| A pure cricket rule that needs no database (over limit, crease state) | `domain/` |
| A rule that needs to look something up first (does the match exist? is the squad already submitted?) | `services/` |
| A shape check (type, min / max, required) | `schemas/` |
| A uniqueness the database must guarantee | `models/` constraint + the service gives a clear error |
| "Which rows do I fetch?" | `repositories/` |
| Status codes, paths, request parsing | `routers/` |

## Too much and too little
- Too much: an interface + factory + manager for a one-line check.
  Ask: what real problem does this extra thing solve today?
- Too little: the same check pasted in several routers. Move it to one service or domain function.

## Boundary examples
Wrong: a domain class importing a Pydantic request schema.
Right: the service converts the schema into plain values, then calls the domain.

Wrong: router checks `if match.status != "live": raise HTTPException(...)`.
Right: service raises `RuleViolationError("Match is not live")`; `main.py` turns it into a 400.

## Wiring
`api/deps.py` has one `get_<thing>_service` function per service. It creates repositories from the
request's session and passes them into the service constructor. A new service means a new function here
(the lead edits this shared file).
