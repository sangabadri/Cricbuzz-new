# Interface Contracts & API Specifications

This document defines the interface contracts between the Frontend and Backend, authentication specifications, and the authorization matrix.

---

## 1. REST API Conventions & Base Configuration

- **Base URL Prefix**: `/api/v1` (defined in `settings.API_V1_PREFIX`).
- **Content Type**: `application/json`.
- **Date/Time Format**: ISO 8601 UTC strings (e.g. `2026-11-14T12:00:00Z`).
- **Standard Error Contract**:
  All non-2xx responses return a consistent JSON payload:
  ```json
  {
    "detail": "Human-readable explanation of the validation or domain error."
  }
  ```

---

## 2. Authentication & Session Contracts

### A. Endpoints
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | No | Register new user (`username`, `password`). Returns `201 Created` with `UserResponse`. |
| `POST` | `/api/v1/auth/token` | No | Login (`username`, `password` as OAuth2 form data). Returns `{ access_token, token_type }` and sets `httpOnly` refresh cookie. |
| `POST` | `/api/v1/auth/refresh` | Cookie | Exchanges refresh cookie for new `{ access_token, token_type }` and rotates cookie. |
| `POST` | `/api/v1/auth/logout` | Optional | Revokes current refresh session in DB and clears `refresh_token` cookie. |
| `GET` | `/api/v1/auth/me` | Bearer | Returns currently authenticated `UserResponse`. |

### B. Headers & Cookies
- **Authorization**: `Bearer <access_token>` (header sent on authenticated requests).
- **Refresh Cookie**: `refresh_token=<token>; Path=/api/v1/auth; HttpOnly; SameSite=Lax`.

---

## 3. Core Resource Endpoints

### A. Teams & Players
| Method | Endpoint | Role Required | Request Body | Response Body |
|---|---|---|---|---|
| `GET` | `/api/v1/teams/` | Public | None | `list[TeamResponse]` |
| `POST` | `/api/v1/teams/` | Authenticated | `TeamCreate` | `TeamResponse` (201) |
| `GET` | `/api/v1/teams/{id}` | Public | None | `TeamResponse` |
| `GET` | `/api/v1/players/` | Public | Optional `?team_id=X` | `list[PlayerResponse]` |
| `POST` | `/api/v1/players/` | Authenticated | `PlayerCreate` | `PlayerResponse` (201) |
| `GET` | `/api/v1/players/{id}` | Public | None | `PlayerResponse` |

### B. Matches & Ownership (ADR-0008)
| Method | Endpoint | Role Required | Description |
|---|---|---|---|
| `GET` | `/api/v1/matches/` | Public | List matches (filter `?status=live`). |
| `POST` | `/api/v1/matches/` | Authenticated | Create match (`MatchCreate`). Creator assigned directly as `matches.owner_id`. |
| `GET` | `/api/v1/matches/{match_id}` | Public | Get full match details. |
| `POST` | `/api/v1/matches/{match_id}/toss` | Match Owner | Record toss result (`TossRecord`). |
| `POST` | `/api/v1/matches/{match_id}/abandon` | Match Owner | Abandon match. |
| `POST` | `/api/v1/matches/{match_id}/mom` | Match Owner | Award Player of the Match. |

### C. Squads & Innings
| Method | Endpoint | Role Required | Description |
|---|---|---|---|
| `POST` | `/api/v1/squads/{match_id}` | Scorer / Owner | Submit 11-player squad (`SquadCreate`). |
| `GET` | `/api/v1/squads/{match_id}` | Public | Get submitted squads for both teams. |
| `POST` | `/api/v1/innings/{match_id}/start` | Scorer / Owner | Start innings (`InningsStart`). |
| `GET` | `/api/v1/innings/{match_id}/{innings_number}` | Public | Get innings status and summary. |

### D. Deliveries & Live Scoring
| Method | Endpoint | Role Required | Description |
|---|---|---|---|
| `POST` | `/api/v1/matches/{match_id}/innings/{innings_number}/deliveries` | Scorer / Owner | Record delivery (`DeliveryCreate`). Supports optional `Idempotency-Key` header to safely retry mutations without duplicate deliveries. Returns `LiveScorerStateResponse`. |
| `DELETE` | `/api/v1/matches/{match_id}/innings/{innings_number}/deliveries/last` | Scorer / Owner | Undo last delivery. Returns reverted `DeliveryResponse`. |
| `PATCH` | `/api/v1/matches/{match_id}/innings/{innings_number}/deliveries/last` | Scorer / Owner | Correct last delivery (`ManualDeliveryUpdate`). Returns updated `DeliveryResponse`. |
| `GET` | `/api/v1/matches/{match_id}/innings/{innings_number}/scorer-state` | Public | Get active scorer state (crease, overs, recent balls). |

### E. Scorecards & Real-Time Push Stream
| Method | Endpoint | Role Required | Description |
|---|---|---|---|
| `GET` | `/api/v1/matches/{match_id}/scorecard` | Public | Full match scorecard (cached via Cache-Aside for completed/abandoned matches). |
| `GET` | `/api/v1/matches/{match_id}/live` | Public | Live summary snapshot (scores, run rates, active batters/bowler). |
| `GET` | `/api/v1/matches/{match_id}/innings/{innings_number}/scorecard` | Public | Single innings scorecard. |
| `GET` | `/api/v1/matches/{match_id}/live-stream` | Public | W3C Server-Sent Events (SSE) push stream for live spectators (`text/event-stream`). Emits `delivery_recorded`, `delivery_patched`, `delivery_undone`, `match_updated`, and heartbeat pings. |
| `POST` | `/api/v1/seed/demo-match` | Public / Dev | Resets & seeds full demo match (India vs Australia T20). |

### F. Health Probes & Observability
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/health` | Public | Legacy health check alias. Returns `200 OK`. |
| `GET` | `/health/live` | Public | Shallow process liveness probe. Returns `200 OK` without database access. |
| `GET` | `/health/ready` | Public | Deep readiness probe. Pings database with `SELECT 1` (2.0s timeout). Returns `200 OK` or `503 Service Unavailable`. |

---

## 4. Role Authorization Matrix

| Action / Endpoint | Public (Unauth) | Non-Owner User | Match Owner | Superuser |
|---|---|---|---|---|
| View match list & status | ALLOW | ALLOW | ALLOW | ALLOW |
| View live match center & scorecards | ALLOW | ALLOW | ALLOW | ALLOW |
| View commentary & squads | ALLOW | ALLOW | ALLOW | ALLOW |
| Create new team / player / match | DENY (401) | ALLOW | ALLOW | ALLOW |
| Record toss | DENY (401) | DENY (403) | ALLOW | ALLOW |
| Submit playing squad | DENY (401) | DENY (403) | ALLOW | ALLOW |
| Start innings / record deliveries | DENY (401) | DENY (403) | ALLOW | ALLOW |
| Undo / correct delivery | DENY (401) | DENY (403) | ALLOW | ALLOW |
| Abandon / Award MoM | DENY (401) | DENY (403) | ALLOW | ALLOW |

*Note on Unassigned Matches*: A match where `owner_id is None` is treated as open/unassigned, allowing scoring without authentication for testing and demo seed compatibility (ADR-0008).

---

## 5. HTTP Status Code Mapping

| Status Code | Meaning in Cricbuzz Tracker | Triggered By |
|---|---|---|
| **200 OK** | Successful read, update, or undo operation | Queries, successful delivery records |
| **201 Created** | Entity created | Team, player, match, squad creation |
| **400 Bad Request** | Domain rule violation | `RuleViolationError`, `CreaseViolationError`, `OverProgressionError` |
| **401 Unauthorized** | Missing or invalid authentication token | `AuthenticationRequiredError`, `InvalidCredentialsError`, `TokenExpiredOrInvalidError` (includes `WWW-Authenticate: Bearer`) |
| **403 Forbidden** | Authenticated user lacks permission for match | `AccessDeniedError`, `InactiveUserError` |
| **404 Not Found** | Entity not found | `EntityNotFoundError` |
| **409 Conflict** | Resource conflict (e.g. username taken) | `EntityConflictError` |
| **422 Unprocessable** | Request schema or parameter validation failure | Pydantic validation errors |
| **429 Too Many Requests** | Distributed rate limit exceeded | `DistributedRateLimitMiddleware` (includes dynamic `Retry-After`, `X-RateLimit-*`) |
| **500 Internal Error**| Unexpected server exception | Database connection failure, unhandled crash |

---

## 6. Distributed Rate Limiting Specification

The API implements distributed rate limiting using Redis atomic counters with automatic fail-open fallback:

### A. Tiers & Thresholds
| Tier | Methods & Endpoints | Limit | Window | Exceeded Response |
|---|---|---|---|---|
| **Public Spectator** | `GET` on `/api/v1/matches/*`, `/live-stream`, `/scorecard` | 60 req/min per IP | 60s | `429 Too Many Requests` |
| **Authentication** | `POST` on `/api/v1/auth/login`, `/api/v1/auth/register` | 10 req/min per IP | 60s | `429 Too Many Requests` |
| **Scorer & Mutations**| `POST`, `PUT`, `PATCH`, `DELETE` or `Authorization: Bearer` | Exempt from spectator quota | N/A | Never blocked by spectator NAT traffic |
| **Infra & Docs** | `/health/*`, `/docs`, `/openapi.json`, `/redoc` | Unlimited | N/A | Never throttled |

### B. Headers
- `X-RateLimit-Limit`: Maximum requests permitted within the 60-second window.
- `X-RateLimit-Remaining`: Remaining request quota for the current window.
- `Retry-After`: Dynamic number of seconds remaining until the rate limit quota resets (sent on `429`).

### C. Anti-Spoofing & Fail-Open Policy
- **Anti-Spoofing**: `X-Forwarded-For` is only honored if the direct socket connection originates from a trusted reverse proxy (`settings.TRUSTED_PROXIES`), preventing arbitrary clients from bypassing limits or performing denial-of-service on victim IPs.
- **Fail-Open Policy**: If Redis is unconfigured or unreachable, rate limiting fails open without rejecting requests, ensuring zero disruption to spectators and live matches.
