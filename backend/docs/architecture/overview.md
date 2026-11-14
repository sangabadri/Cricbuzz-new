# Backend Architecture Overview

This document describes the high-level architecture of the Cricbuzz Tracker FastAPI backend, its design principles, and its structural isolation boundaries.

---

## 1. Architectural Philosophy: Clean Architecture & DDD

The backend follows the principles of **Clean Architecture** and **Domain-Driven Design (DDD)** (formalized in [ADR-0001](../../../docs/decisions/0001-backend-layers.md)).

The core rationale is simple: **Cricket rules (crease state, overs, extras, wickets, match resolutions) are the heart of the business.** They must be deterministic, pure, and testable without spinning up an HTTP server or a database connection.

```
       +-------------------------------------------------------+
       |                  ROUTER LAYER (FastAPI)               |
       |  - Parses HTTP requests & paths                       |
       |  - Injects services via Depends(get_*_service)        |
       |  - Delegates to ONE service method                    |
       +---------------------------|---------------------------+
                                   |
       +---------------------------v---------------------------+
       |                  SERVICE LAYER                        |
       |  - Orchestrates business workflows                    |
       |  - Evaluates domain permissions                       |
       |  - Enforces database row locking (ADR-0003)           |
       |  - Raises typed exceptions (exceptions.py)            |
       +-------------------|-------------------|---------------+
                           |                   |
       +-------------------v---+           +---v---------------+
       |     DOMAIN LAYER      |           | REPOSITORY LAYER  |
       |  (Pure Python Rules)  |           | (Async SQLAlchemy)|
       |  - CreaseState        |           | - select / add    |
       |  - InningsAggregate   |           | - flush only      |
       |  - Format strategies  |           +---------|---------+
       |  Zero framework deps! |                     |
       +-----------------------+           +---------v---------+
                                           |   DATABASE ENGINE |
                                           |   (AsyncPG / PG16)|
                                           +-------------------+
```

---

## 2. Inversion of Control & Dependency Wiring

- **Constructors**: Services receive repository interfaces through `__init__`, enabling trivial unit testing with `AsyncMock`.
- **Wiring**: FastAPI's `Depends()` in `app/api/deps.py` resolves the active database session from `get_db()`, instantiates the required repositories, and injects them into the service constructor.
- **Independence**: Neither services nor repositories know anything about HTTP status codes, headers, or web routing.

---

## 3. Layer Separation Guarantees

An automated test (`tests/unit/test_architecture.py`) inspects the AST of every module in `backend/app/domain/` to mechanically enforce:
1. No imports of `fastapi` or `starlette`.
2. No imports of `sqlalchemy`.
3. No imports of `pydantic`.
4. No imports of outer backend layers (`services`, `routers`, `repositories`, `models`).
