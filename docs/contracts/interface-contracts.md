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
| `POST` | `/api/v1/deliveries/{match_id}/{innings_number}` | Scorer / Owner | Record delivery (`DeliveryCreate` with optional `new_batter_id`). Returns `ScorerStateResponse`. |
| `DELETE` | `/api/v1/deliveries/{match_id}/{innings_number}/last` | Scorer / Owner | Undo last delivery. Returns reverted `ScorerStateResponse`. |
| `PATCH` | `/api/v1/deliveries/{match_id}/{innings_number}/last` | Scorer / Owner | Correct last delivery (`DeliveryUpdate`). Returns updated `ScorerStateResponse`. |
| `GET` | `/api/v1/deliveries/{match_id}/{innings_number}/scorer-state` | Public | Get active scorer state (crease, overs, recent balls). |

### E. Scorecards & Match Center
| Method | Endpoint | Role Required | Description |
|---|---|---|---|
| `GET` | `/api/v1/scorecards/{match_id}` | Public | Full match scorecard (both innings, batting, bowling, extras). |
| `GET` | `/api/v1/scorecards/{match_id}/live` | Public | Live summary snapshot (scores, run rates, active batters/bowler). |
| `POST` | `/api/v1/seed/demo` | Public / Dev | Resets & seeds full demo match (India vs Australia T20). |

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
| **500 Internal Error**| Unexpected server exception | Database connection failure, unhandled crash |
