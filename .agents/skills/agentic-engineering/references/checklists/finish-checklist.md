# Finish checklist

Work is done only when all are true.

## Behaviour
- [ ] Every line of "How we know it works" is implemented AND has a test or a manual check.
- [ ] Odd cases covered: empty, duplicate, wrong state, repeated request.
- [ ] Old behaviour still works (existing tests untouched and passing).

## Checks
- [ ] Backend: `pytest` passes (if backend touched).
- [ ] Frontend: `npm run lint`, `npm test`, `npm run build` pass (if frontend touched).
- [ ] All of the above ran on the final code.
- [ ] Main user journey tried by hand (medium and large).

## Code quality
- [ ] Diff reviewed (`diff-review.md`).
- [ ] Layers respected (see the part's AGENTS.md).
- [ ] No unrelated changes. No new library unless approved.
- [ ] No function I touched got longer than before beyond the limit.

## Knowledge
- [ ] Docs updated if behaviour or rules changed.
- [ ] Decision record written if a real design choice was made.
- [ ] Tombstone Hygiene: If any entity/model/table was deleted or superseded, a repository-wide search (`git grep -i <entity>`) was executed to purge orphan references from active documentation.
- [ ] Known limits and skipped work written in the report.
- [ ] Session notes written if work continues later.
