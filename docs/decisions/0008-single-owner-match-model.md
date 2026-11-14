# 0008: Single-Owner Match Model & Removal of Match Roles

- Status: Accepted
- Date: 2026-11-14
- Supersedes: ADR-0007

## Situation
In ADR-0007, multi-user match sharing and fine-grained roles (`OWNER`, `SCORER`, `VIEWER`) were introduced via a separate `match_access` table.
In practice, match scoring in Cricbuzz Tracker is personal and unshared: a match belongs to exactly one person (its creator/owner). Multi-user delegation introduced unnecessary join overhead, extra tables, role assignment endpoints, access modals, and cognitive complexity.

## Decision
1. **Direct `owner_id` Column on `matches`**:
   - Add `owner_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)` directly to the `matches` table.
2. **Elimination of `match_access` & Roles**:
   - Drop the `match_access` table, repository, service, and `/matches/{match_id}/access` endpoints.
   - Remove `MatchUserRole` enum and `MatchAccessModal` frontend component.
3. **Authorization Invariants**:
   - A match belongs to exactly one user (`matches.owner_id`).
   - If `matches.owner_id is None`: The match is an unassigned public demo/test fixture; mutation is open without authentication.
   - If `matches.owner_id is not None`: Only the match owner (`current_user.id == match.owner_id`) or an active superuser (`current_user.is_superuser`) can mutate the match (conduct toss, submit squads, start innings, record deliveries, abandon, award MoM). All other authenticated users receive `403 Forbidden`; unauthenticated requests receive `401 Unauthorized` with `WWW-Authenticate: Bearer`.
   - Public Spectator Access (ADR-0005) remains 100% unauthenticated for all read-only endpoints (`GET /matches`, `GET /matches/{id}`, `GET /matches/{id}/scorecard`, `GET /matches/{id}/live-ticker`).

## Consequences
Good:
- Eliminates relational joins and subqueries on every delivery and match mutation.
- Drastically simplifies backend authorization to a fast direct equality check (`current_user.id == match.owner_id`).
- Reduces frontend bundle size by removing `MatchAccessModal` and dead sharing controls.
- Keeps public demo and automated test fixtures working seamlessly via `owner_id = None`.

Costs / Things to watch:
- Multi-scorer collaboration is disabled; if delegation is requested in the future, it must be designed with explicit requirement justification.
