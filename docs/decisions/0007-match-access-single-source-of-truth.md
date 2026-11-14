# 0007: Canonical Match Ownership in MatchAccess (Single Source of Truth)

- Status: Accepted
- Date: 2026-11-13

## Situation
Match ownership was previously tracked in two parallel locations:
1. `matches.created_by` (Foreign Key on `matches` table).
2. `match_access` table with `role = MatchUserRole.OWNER`.

This led to dual-source-of-truth drift: updating or granting ownership via `match_access` did not update `matches.created_by`. Furthermore, `matches.created_by` used `ondelete="SET NULL"` while `match_access.user_id` used `ondelete="CASCADE"`, causing deleted owners to silently convert private matches into unprotected public fixtures.

## Decision
Remove `created_by` from the `matches` model and table schema entirely. Keep the `Match` entity pure cricket domain data (teams, venue, format, status, date, toss, winner, margins).

The `match_access` table is the sole, canonical source of truth for match authorization and ownership:
- A user with `role = OWNER` in `match_access` is the owner of that match.
- Sole Owner Invariant: A match's only owner cannot be demoted (e.g. to `SCORER` or `VIEWER`) or revoked; an owner must first grant `OWNER` to another user before relinquishing ownership, guaranteeing that protected matches cannot be orphaned.
- A match with no entries in `match_access` is an unassigned/legacy fixture (accessible without auth for compatibility with test seeds).
- A match with any entry in `match_access` is a protected match; modifying it requires explicit permission in `match_access` or superuser privileges.

## Other options considered
- Keeping `matches.created_by` and syncing it with `match_access`: Rejected because dual sources of truth inevitably drift and complicate database mutations.
- Storing all roles in `matches` table columns: Rejected because matches can have multiple scorers and viewers, requiring a relational association table.

## Results
Good:
- `Match` entity remains focused purely on cricket domain concerns.
- Ownership drift is completely impossible.
- Simplifies `MatchRepository.create()` to accept only cricket data.
- Single database query can resolve both match existence and user roles.

Costs / things to watch:
- Unassigned matches must be identified by checking whether any rows exist in `match_access` for that `match_id`. A fast index lookup on `match_access.match_id` handles this in < 1ms.
- Demo fixtures and squad endpoints wired via `app/api/deps.py` (`get_squad_service`, `get_demo_seed_service`) preserve single-source-of-truth access guards without bypassing `MatchAccessService`.
