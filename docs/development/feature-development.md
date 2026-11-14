# Feature Development Guide

This guide describes how to introduce new features into Cricbuzz Tracker while preserving architectural integrity, layer boundaries, and code quality.

---

## 1. Feature Inception & Analysis

Before writing code:
1. **Understand Requirements & Acceptance Criteria**: Check `docs/product/requirements.md` or the user prompt. Identify the specific inputs, outputs, states, and error conditions.
2. **Identify Existing Abstractions to Reuse**:
   - Check if an existing service or repository already queries the required entities.
   - Look at reference implementations (e.g. `SquadService` for validation flows; `BattingTable` for UI display).
3. **Check Autonomy Limits**:
   - Does this feature need a new database column or table? -> **Stop and Ask**.
   - Does it change an existing public endpoint contract? -> **Stop and Ask**.
   - Does it involve authorization or roles? -> **Stop and Ask**.

---

## 2. Vertical Implementation Sequence

When building a full-stack feature, execute the layers in this strict sequence:

```
[1. Backend Schemas] ---> [2. Pure Domain Rules] ---> [3. Repositories]
                                                             |
[6. E2E API Tests]   <--- [5. Router & Deps Wiring] <--- [4. Service Logic]
       |
       v
[7. Frontend Types]  ---> [8. API Client Method] ---> [9. TanStack Query Hook]
                                                             |
[12. Lint, Test, Build] <-- [11. Page & Route]   <--- [10. UI Components]
```

### Step 1: Backend Schemas (`backend/app/schemas/`)
Define request and response contracts:
- `XCreate` (input validation, types, field descriptions).
- `XUpdate` (optional fields for modifications).
- `XResponse` (output serialization with `model_config = ConfigDict(from_attributes=True)`).

### Step 2: Pure Domain Rules (`backend/app/domain/`)
If the feature includes pure cricket logic (e.g. calculation, crease rules, format limitations):
- Write plain Python functions or classes in `app/domain/`.
- Ensure **zero imports** from FastAPI, SQLAlchemy, or Pydantic.
- Write isolated unit tests in `tests/unit/domain/`.

### Step 3: Database & Repositories (`backend/app/repositories/`)
- Add query methods using `select()`, `add()`, `flush()`.
- Never call `session.commit()` inside a repository (transactions are managed by `get_db()`).

### Step 4: Service Logic (`backend/app/services/`)
- Implement business orchestrations and validation checks.
- Raise typed domain errors from `app/domain/exceptions.py`.
- Keep methods focused (under 40 lines). Extract private helpers if needed.
- Write unit tests in `tests/unit/` using mocked repositories.

### Step 5: Wire Dependencies & Router (`app/api/deps.py` & `app/routers/`)
- Add service factory in `api/deps.py` injecting repository instances.
- Implement the router endpoint: read input, invoke **one** service method, return response.
- Register router in `app/routers/api.py`.

### Step 6: Backend Request-Path Test (`backend/tests/e2e/`)
- Write an E2E test using `AsgiTestClient`.
- Verify HTTP status code, response body, and persistent effect in DB.
- Test rejection cases (400, 401, 403, 404).

### Step 7: Frontend Type Definitions (`frontend/src/types/`)
- Define TypeScript interfaces matching backend response schemas exactly.

### Step 8: Frontend API Client Method (`frontend/src/lib/api-client.ts`)
- Add single typed method to `cricketApi` object.

### Step 9: TanStack Query Hook (`frontend/src/features/<feature>/hooks/`)
- Write a query hook (`useQuery`) or mutation hook (`useMutation`).
- Ensure mutations invalidate affected query keys (`queryClient.invalidateQueries(...)`).

### Step 10: Atomic & Feature Components (`frontend/src/features/<feature>/components/`)
- Build presentation components receiving typed props and firing callbacks.
- Reuse atomic components from `src/components/ui/`.
- Handle loading, empty, and error states explicitly.

### Step 11: Page & Routing (`frontend/src/features/<feature>/pages/` & `src/app/router/`)
- Compose components on the page.
- Add route to `src/app/router/index.tsx`.

### Step 12: Automated Verification
- Run full automated checks: backend pytest, frontend lint, vitest, and build.
