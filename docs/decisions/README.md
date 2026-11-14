# Architecture Decision Records (ADRs)

Short records of architectural and design choices, their context, decisions, and trade-offs.
Template: [`.agents/skills/agentic-engineering/resources/templates/decision-record.md`](../../.agents/skills/agentic-engineering/resources/templates/decision-record.md).

> [!IMPORTANT]
> Never rewrite an accepted record. Supersede it by creating a new record referencing the superseded ADR.

---

## 📋 ADR Catalog

| No. | Title & Link | Status | Context & Core Decision |
|---|---|---|---|
| **0001** | [Backend Layers and the Pure Domain](0001-backend-layers.md) | Accepted | Backend organized in Clean Architecture layers; `domain/` has zero framework/ORM imports. |
| **0002** | [Async Database, One Transaction per Request](0002-async-database.md) | Accepted | PostgreSQL via `AsyncSession`; `get_db()` commits on success, rolls back on error; repos use flush. |
| **0003** | [Lock Order When Scoring: Match, Then Innings](0003-lock-order.md) | Accepted | Deterministic row locking with `for_update=True`: lock `Match` first, then `Innings` to prevent deadlocks. |
| **0004** | [Domain Errors Become HTTP Answers in One Place](0004-domain-errors.md) | Accepted | Services raise pure domain exceptions; `main.py` maps them centrally via `DOMAIN_EXCEPTION_STATUS_MAP`. |
| **0005** | [Auth & Match Access Architectural Debt Status](0005-no-auth.md) | Accepted | Preserves unauthenticated public spectator access; catalogs technical debt in `known-problems.md`. |
| **0006** | [Frontend: Feature Folders, Server Data via TanStack Query](0006-frontend-structure.md) | Accepted | Feature-sliced layout; server state in TanStack Query; no cricket calculations in the UI. |
| **0007** | [Canonical Match Ownership in MatchAccess (Single Source of Truth)](0007-match-access-single-source-of-truth.md) | Superseded | `match_access` is sole source of truth; removed `matches.created_by` to prevent dual-source drift. Superseded by ADR-0008. |
| **0008** | [Single-Owner Match Model & Removal of Match Roles](0008-single-owner-match-model.md) | Accepted | A match belongs to exactly one user via direct `matches.owner_id`. Eliminated `match_access` table and multi-user roles. |
