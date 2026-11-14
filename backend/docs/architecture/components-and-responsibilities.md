# Backend Components & Responsibilities

This document defines the exact responsibilities, boundaries, and import constraints of each component layer in the FastAPI backend.

---

## 1. Component Boundaries & Import Rules

| Layer | Location | Permitted Imports | Strictly Prohibited Imports |
|---|---|---|---|
| **Domain** | `app/domain/` | Standard library, other `domain` modules | `fastapi`, `starlette`, `sqlalchemy`, `pydantic`, `services`, `routers`, `models`, `repositories` |
| **Schemas** | `app/schemas/` | `pydantic`, `domain.enums`, standard library | `services`, `routers`, `repositories`, `models`, `sqlalchemy` |
| **Models** | `app/models/` | `sqlalchemy`, `app.models.base`, `domain.enums` | `services`, `routers`, `fastapi`, `schemas` |
| **Repositories** | `app/repositories/`| `sqlalchemy`, `app.models`, `app.schemas` (input shapes), standard library | `services`, `routers`, `fastapi` |
| **Services** | `app/services/` | `app.domain`, `app.models`, `app.repositories`, `app.schemas`, standard library | `fastapi`, `starlette`, `app.routers` |
| **Routers** | `app/routers/` | `fastapi`, `app.schemas`, `app.services`, `app.api.deps`, `app.models` (type hints only) | `app.repositories`, raw `sqlalchemy` queries |
| **Dependency Injection** | `app/api/deps.py` | `fastapi`, `app.database`, `app.repositories`, `app.services` | Domain rule evaluations, raw SQL queries, `HTTPException` raises |

---

## 2. Layer Responsibilities in Detail

### A. Domain Layer (`app/domain/`)
- Contains pure cricket mathematics, state machines, and invariants.
- **Components**:
  - `CreaseState`: Tracks active striker, non-striker, bowler, and dismissals.
  - `InningsAggregate`: Reconstructs innings score, runs off bat, extras, wickets, and overs from delivery history.
  - `MatchFormatRules`: Strategy pattern for format-specific limits (T20 vs ODI).
  - `exceptions.py`: Typed domain errors (`RuleViolationError`, `CreaseViolationError`, `EntityNotFoundError`, etc.).

### B. Schemas Layer (`app/schemas/`)
- Validates external incoming JSON payloads and serializes outgoing responses using Pydantic v2.
- Enforces syntax constraints, string length limits, enum validation, and optional fields.
- Converts ORM model attributes to JSON via `ConfigDict(from_attributes=True)`.

### C. Models Layer (`app/models/`)
- Defines PostgreSQL relational schemas using SQLAlchemy 2.0 Declarative Base.
- Specifies table names, primary keys, foreign keys (`ForeignKey(..., ondelete=...)`), column data types, unique constraints, and relationship cascades.

### D. Repositories Layer (`app/repositories/`)
- Executes database queries using `session.execute(select(...))`.
- Adds new entity instances via `self.session.add(...)`.
- Calls `await self.session.flush()` when generated primary keys (IDs) are needed immediately.
- **Never commits**: Transaction commit is the exclusive duty of `get_db()`.

### E. Services Layer (`app/services/`)
- Orchestrates business use cases.
- Coordinates between repositories, domain aggregates, and database transactions.
- Enforces deterministic row locking (`for_update=True`, ADR-0003: Match locked first, then Innings).
- Enforces entity lifecycle guards (e.g. `InningsService` rejecting innings creation on completed/abandoned matches or exceeding format limits).
- Enforces access boundaries (e.g. `MatchAccessService` safeguarding sole match ownership against demotion or revocation).
- Employs focused single-responsibility projection and orchestration helpers:
  - `ScorecardService` decomposes scorecard assembly into `_build_batting_scorecards`, `_build_bowling_scorecards`, `_build_fall_of_wickets`, and `_build_partnerships`, and live ticker projection into `_build_current_over_balls`, `_project_live_batter`, `_project_live_bowler`, and `_calculate_chase_status` with zero N+1 database queries.
  - `DeliveryService` decomposes ball recording and retroactive PATCH updates into `_resolve_delivery_participants`, `_resolve_patch_fields`, `_build_simulated_deliveries`, and unified match lifecycle synchronization `_sync_match_completion_status`.
  - `InningsService` decomposes innings creation and opening batsman setup into `_validate_innings_prerequisites`, `_resolve_target_innings_number`, `_create_or_get_innings_1`, `_create_or_get_innings_2`, `_create_or_get_multi_innings`, and `_validate_start_squad_eligibility`.
- Raises pure domain exceptions on invariant violations.

### F. Routers Layer (`app/routers/`)
- Maps HTTP verbs and paths (`@router.post(...)`, `@router.get(...)`).
- Extracts path parameters, query parameters, request bodies, and authentication dependencies.
- Delegates execution to exactly **one** service method call.
- Returns serialized response models.

### G. Dependency Injection (`app/api/deps.py`)
- Provides reusable FastAPI `Depends()` factories.
- Instantiates repository instances from the active session (`get_*_repo`).
- Wires repositories into service constructors (`get_*_service`).
