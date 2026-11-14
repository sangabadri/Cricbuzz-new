# Diff review

Do this before accepting any work, yours or an agent's.

## Quick version (small tasks)
- [ ] `git status`: only expected files.
- [ ] `git diff`: every changed line has a reason.
- [ ] Tests for the change exist and passed on the final code.

## Full version
1. [ ] `git status` and `git diff --stat`. Anything unexpected? (lock files, formatting-only changes,
       other folders, deleted tests)
2. [ ] Read the full `git diff` in this order:
   - [ ] Domain: pure Python, no FastAPI / SQLAlchemy / Pydantic imports.
   - [ ] Schemas: names `XCreate`, `XUpdate`, `XResponse`; fields match the requirement.
   - [ ] Repositories: only database access, no business rules.
   - [ ] Services: business rules here, domain errors raised, no HTTP imports.
   - [ ] Routers: thin, no rules, no database calls.
   - [ ] Frontend types and API client: match backend responses.
   - [ ] Hooks / components / pages: right place, right size, loading + empty + error states.
   - [ ] Tests: they check requirements, not copies of the implementation.
   - [ ] Documentation diff: check docs diff against baseline (`git show HEAD:<doc>`). Verify no unauthorized modification of cricket rules, weakened security invariants, or circular-truth justifications.
   - [ ] Entity Tombstone Hygiene: If files or models were deleted via `git rm`, verify with `git grep` that the deleted entity stem is not lingering in architecture diagrams, ERDs, personas, or test matrices.
   - [ ] Config / dependencies: any new library justified and approved?
3. [ ] Changes outside the brief? Move them out or explain.
4. [ ] Any function longer than 80 lines made longer? (see `backend/docs/known-problems.md`)
5. [ ] No secrets, no debug prints, no commented-out code, no leftover TODO without a note.
6. [ ] Tests, lint, build ran AFTER the last code change.
