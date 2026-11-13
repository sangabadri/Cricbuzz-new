# Work split (for large work or several agents)

Fill in AFTER the design plan and contracts are approved.

## Contracts (fixed, nobody changes these alone)
### Database
Tables, columns, relations.
### API
| Method + path | Request | Success response | Errors |
|---|---|---|---|
### Frontend types
Which types in `frontend/src/types` match which API responses.

## Order of work
```
contract
   |
   +--> database + backend
   |
   +--> frontend (against the contract)
   |
join --> tests --> review
```
(Edit to match the real work.)

## Jobs
Copy one block per job.

### Job N: <name>
- Agent / role:
- Goal:
- Owns (may edit):
- May read:
- Must not touch:
- Needs first (dependencies):
- Delivers:
- Done when (tests / checks):
- If blocked or the contract looks wrong: stop and report to the lead.

## Shared files (only the lead edits these, one at a time)
-

## Join plan
1. Merge order:
2. After each merge, run:
3. Final checks (full suite, main journey by hand):
