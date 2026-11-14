# Requirements to Tests: Verification Matrix

This document defines how system requirements from `docs/product/requirements.md` are translated into concrete test scenarios across the 7 testing dimensions.

---

## 1. The 7 Testing Dimensions

Every feature or significant change must be verified across the following 7 dimensions:

| Dimension | Purpose | Scenario Examples in Cricbuzz Tracker |
|---|---|---|
| **1. Functional** | Verify specified behaviors and acceptance criteria. | Legal delivery increments total runs and batter score; toss winner choosing bat sets 1st innings batting team. |
| **2. Non-Functional** | Verify performance, security, and accessibility. | Match auth context resolved in single index seek (<5ms); public match endpoints accessible without auth header; keypad touch target >= 44px. |
| **3. Boundary** | Verify min, max, empty, and extreme boundary transitions. | Ball 6 in an over completes over; 10th wicket falls ending innings; bowler reaches 4.0 overs in T20 (quota reached). |
| **4. Negative** | Verify that invalid, illegal, or prohibited actions are rejected. | Submitting Playing XI with 10 players; re-assigning dismissed batter to crease; consecutive overs by same bowler. |
| **5. Failure** | Verify system resilience under errors and unexpected responses. | Database rollback when delivery creation fails; token refresh failure redirecting to login; error boundary catching UI render crashes. |
| **6. Integration** | Verify multi-component contracts and database persistence. | Recording delivery updates match scorecard API and invalidates frontend TanStack Query cache. |
| **7. Regression** | Ensure previous working functionality is not broken by new code. | Undoing delivery restores exact previous crease state and individual player scorecards. |

---

## 2. Requirements-to-Tests Traceability Matrix

| Requirement | Test Dimension | Scenario to Verify | Target Test File |
|---|---|---|---|
| **FR-1.1** (Team creation) | Functional | Create team with name, short_name, colors. | `backend/tests/unit/test_match_and_delivery_services.py` |
| **FR-1.3** (Team validation)| Negative / Boundary | Reject empty name or whitespace-only short code. | `backend/tests/unit/test_match_and_delivery_services.py` |
| **FR-2.1** (Match setup) | Functional | Match created between Team A and Team B in T20 format. | `backend/tests/e2e/test_match_lifecycle_e2e.py` |
| **FR-2.3** (Playing XI) | Boundary / Negative | Reject squad with 10 players (400 RuleViolationError). | `backend/tests/unit/test_squad_service.py` |
| **FR-2.4** (Capt & Keeper) | Negative | Reject squad where captain or keeper is not in Playing XI. | `backend/tests/unit/test_squad_service.py` |
| **FR-2.5** (No dual squad)| Negative | Reject player appearing in both squads for same match. | `backend/tests/unit/test_squad_service.py` |
| **FR-2.6** (Toss recording)| Functional | Record toss; transitions match to `toss_done`. | `backend/tests/e2e/test_match_lifecycle_e2e.py` |
| **FR-3.1** (Innings start) | Functional | Start innings 1 with opening batters and bowler; status `live`. | `backend/tests/e2e/test_match_lifecycle_e2e.py` |
| **FR-3.3** (Crease distinct)| Negative | Reject opening striker and non-striker being same player ID. | `backend/tests/unit/domain/test_crease.py` |
| **FR-3.5** (Innings 1 end) | Boundary | 10th wicket or 20.0 overs completed transitions to `innings_break`. | `backend/tests/unit/domain/test_innings_aggregate.py` |
| **FR-3.8** (Match end) | Functional / Boundary | Innings 2 reaches target; sets winner and margin in wickets. | `backend/tests/e2e/test_match_lifecycle_e2e.py` |
| **FR-4.1** (Record delivery)| Functional | Record 4 runs off bat; updates batter and team score. | `backend/tests/unit/domain/test_innings_aggregate.py` |
| **FR-4.3** (Wide / No-ball)| Functional / Boundary | Wide adds 1 penalty run, ball not counted in legal over balls. | `backend/tests/unit/test_delivery_rules.py` |
| **FR-4.5** (Strike rotation)| Functional | Odd runs (1, 3) swap striker and non-striker. End of over swaps ends. | `backend/tests/unit/domain/test_crease.py` |
| **FR-4.6** (Bowler limits) | Negative / Boundary | Reject bowler bowling 5th over in T20; reject same bowler in consecutive overs. | `backend/tests/unit/domain/test_format_rules.py` |
| **FR-4.7** (Dismissal) | Negative | Dismissed batter cannot be re-added to crease in same innings. | `backend/tests/unit/domain/test_crease.py` |
| **FR-5.1** (Undo delivery) | Functional / Regression | Undo last delivery restores previous score and crease state. | `backend/tests/unit/test_delivery_rules.py` |
| **FR-5.4** (Delivery patch) | Integration | Updating last delivery re-computes aggregate score atomically. | `backend/tests/unit/test_delivery_patch_and_concurrency.py` |
| **FR-6.2** (Scorecards) | Functional | Scorecard accurately aggregates 4s, 6s, strike rate, overs, maidens, economy. | `backend/tests/unit/test_scorecard_service.py` |
| **FR-7.3** (Refresh cookie)| Security (NFR) | Refresh token transmitted only via `httpOnly`, `SameSite=Lax` cookie. | `backend/tests/e2e/test_auth_and_access_e2e.py` |
| **FR-7.5** (Reuse attack) | Security (Negative) | Replaying revoked refresh token revokes all user sessions. | `backend/tests/unit/test_refresh_token_repository.py` |
| **FR-8.1** (Match ownership)| Security / Contract | Match creator assigned `owner` role in `match_access`. | `backend/tests/unit/test_match_access_authorization.py` |
| **FR-8.3** (Scoring guard) | Negative / Security | Non-scorer user rejected with HTTP 403 when recording ball. | `backend/tests/unit/test_match_access_authorization.py` |
| **FR-8.5** (Public access) | Non-Functional | Anonymous spectator can fetch match list, live summary, and scorecards. | `backend/tests/e2e/test_auth_and_access_e2e.py` |
| **NFR-1.2** (Lock order) | Concurrency (Failure) | Concurrent scoring calls acquire match then innings locks without deadlock. | `backend/tests/unit/test_delivery_patch_and_concurrency.py` |
| **NFR-2.1** (Domain isolation)| Architecture | `app/domain` contains zero framework/ORM imports. | `backend/tests/unit/test_architecture.py` |
| **UI Empty States** | Functional / Usability | BattingTable shows "No batting data available" when batters list empty. | `frontend/src/features/matches/components/__tests__/BattingTable.test.tsx` |
| **UI Error Handling** | Failure | API error displayed via `getApiErrorMessage`; ErrorBoundary catches crashes. | `frontend/src/components/common/__tests__/ErrorBoundary.test.tsx` |
| **Concurrent 401** | Concurrency / Failure | Multiple 401s coalesced into single `/auth/refresh` call. | `frontend/src/lib/__tests__/api-client.test.ts` |

---

## 3. Deriving Tests for New Requirements: Checklist

When an agent is assigned a new requirement:
1. **Identify the Happy Path**: Given valid inputs, does the expected state change occur?
2. **Identify Boundary Extremes**: Min value (0 runs, 0 overs), max value (over limit, 10 wickets), first item, last item.
3. **Identify Negative Cases**: What illegal actions must be rejected? What error type and message should be raised?
4. **Identify Failure Modes**: What if the database raises an error? What if the network drops? Does the system rollback or display an error message?
5. **Identify Concurrency Scenarios**: What if two requests arrive simultaneously for the same match?
