# Small task process

Examples: add a missing validation, fix a wrong status code, change a label, fix a small bug.

## Steps
1. **Say the behaviour in 2 to 4 lines.** What should happen? What should NOT change?
   (Use the small version of [task-brief.md](../../resources/templates/task-brief.md).)
2. **Read the nearby code.** Find a similar thing already in the repo and copy its style.
3. **Write the test first or together**, from the behaviour you stated. Include one odd case
   (empty, duplicate, wrong state).
4. **Make the change.** Smallest possible change.
5. **Run the focused tests**, then the whole test suite of that part (backend or frontend).
6. **Read your own diff** ([diff-review.md](../checklists/diff-review.md), quick version).
7. **Report**: what changed, which tests ran, anything you were unsure about.

## Do not
- Start planning documents, decision records or multi-agent work.
- Fix other things you notice. Write them down in the report instead.

## Stop and ask if
- The "obvious" fix needs a new column, a new endpoint, or changes a cricket rule.
- The same bug seems to exist in several places.
