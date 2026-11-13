# Decision records

Short notes on important choices and the reason. Template: `../templates/decision-record.md`.
Never rewrite an old record. Replace it with a new one.

| No. | Title | Status |
|---|---|---|
| 0001 | Backend layers and the pure domain | Accepted |
| 0002 | Async database, one transaction per request | Accepted |
| 0003 | Lock order when scoring: match, then innings | Accepted |
| 0004 | Domain errors become HTTP answers in one place | Accepted |
| 0005 | Auth & match access architectural debt status | Accepted |
| 0006 | Frontend: feature folders, server data via TanStack Query | Accepted |

Records 0001 to 0004 describe what the code already does (checked against the code on 2026-11-12).
If code and record disagree, report it. Do not "fix" either side silently.
