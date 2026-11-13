# Adding a backend feature: the order

Do the steps in this order. Run focused tests after each one.

1. **Requirement lines** (task brief). Which lines are rules, which are shapes?
2. **Schemas**: `XCreate`, `XResponse`. Shape errors are caught here.
3. **Domain rule** (only if it is a pure cricket rule): write the rule and its unit test.
4. **Model + constraint** (only if approved. New table/column = Stop and ask).
5. **Repository method(s)**: query only.
6. **Service method**: checks in a clear order, each with its own message. Unit test with mocked repositories:
   one happy path, and one test for every rejection.
7. **Wire it** in `api/deps.py` if it is a new service.
8. **Router**: one service call. Register in `routers/api.py` if new.
9. **Request-path test** in `tests/e2e/`: call the real endpoint, check status code and body, then check the effect
   (for example after creating, read it back).
10. **Whole suite**: `pytest`.
11. **Docs**: new rule -> `docs/domain/cricket-rules.md`. New design choice -> decision record.

## Questions to ask before finishing
- Did I change an existing response? The frontend may break. (Stop and ask)
- Is there a case that changes state twice at once? Lock order.
- Did I copy a pattern or invent one?
