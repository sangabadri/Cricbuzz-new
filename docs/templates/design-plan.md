# Design plan

Write this BEFORE changing code. Human approves before building.
Save to `docs/notes/<date>-<short-name>-plan.md`.

## 1. What I understood
Two to five lines. Include anything I am unsure about.

## 2. What could be affected
Tick what applies, name the files.
- [ ] Database tables / columns
- [ ] Domain rules (`backend/app/domain`)
- [ ] Schemas
- [ ] Repositories
- [ ] Services
- [ ] Routers / API shape
- [ ] Frontend types
- [ ] Frontend API client / hooks
- [ ] Pages / components
- [ ] Tests
- [ ] Config / Docker / k8s
- [ ] Docs

## 3. Similar feature I studied
Name it and the files. "I will follow this pattern."

## 4. Proposed design
Where each piece goes and what it is responsible for. Data flow from request to database and back.

## 5. Options and trade-offs
| Option | Good | Bad |
|---|---|---|
| A (recommended) | | |
| B | | |

## 6. Is it too much or too little?
For each new class, file or layer: what real problem does it solve today?
Anything added "for later" must be removed.

## 7. Decisions that need a human ("Stop and ask")
- [ ] Database change
- [ ] API change
- [ ] New pattern or library
- [ ] Security / ownership
- [ ] Cricket rule

## 8. Build order
Step 1 ... Step 2 ... Each step testable alone.

## 9. How I will check it
Which tests for which requirement line, plus manual check.

## 10. Approval
- [ ] Approved by:   Date:   Changes requested:
