# Pick the size first

Use the cheapest process that still gives you enough confidence. More steps and more agents
cost time and add mistakes of their own.

| Question | Small | Medium | Large |
|---|---|---|---|
| Files touched | 1 to 3 | 4 to 12 | Many, across backend + frontend + database |
| New table, column or API shape? | No | New endpoint on the existing design | Yes |
| New concept or pattern? | No | No | Yes |
| Business rule unclear? | No | Maybe | Often |
| Process | `01-small-task.md` | `02-medium-feature.md` | `03-large-feature.md` |
| Agents | 1 | 1 (2nd one to review if risky) | Lead + helpers, only where work is independent |
| Written files | Short brief in chat | Task brief + design plan | Task brief + design plan + work split + decision record |

## Always treat as LARGE (even if it looks small)
- Anything about who can do what (login, permissions, roles, sharing).
- Anything that changes how data is stored (new table, new column, changed relation).
- Anything that changes the public API in a way the frontend must follow.
- Anything that rewrites a big part of the folder structure.

## If unsure
Start as the smaller size. If you meet a surprise (a table is needed, a rule is unclear), stop and
move up one size. Moving up is normal. Silently doing large work inside a small task is not.

## Past lesson (why this page exists)
One commit added login, permissions, a new layout system, and 50+ frontend files together.
Nobody could review it, and mistakes in the design spread everywhere. Large work must be cut
into steps, each approved and checked on its own.
