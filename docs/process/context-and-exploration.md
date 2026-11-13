# Context and exploring the code

## The idea
Give the agent the *right* information, not the *most*. A file existing in the repo does not mean
the agent has read it. An agent saying "I understand" does not prove it does.

## What to give, in this order
1. `AGENTS.md` files (rules).
2. The task brief.
3. Only the guides that matter for this task.
4. Let the agent find the code itself, then check what it found.

## Five kinds of exploring
| Kind | Question | Example prompt |
|---|---|---|
| Structure | Where is what? | "List the folders in backend/app and what each one does. Do not edit." |
| Rules of the design | Who is responsible for what? | "Which layer validates a squad? Show file and function." |
| Domain | What are the business rules? | "List every rule enforced when a delivery is recorded. Cite code." |
| Pattern | How is a similar thing done? | "Trace how a squad is created, router to database." |
| Impact | What could my change break? | "What calls `update_last_delivery`? Which tests cover it?" |

## Trace, do not summarize
Bad: "Summarize every file in services/."
Good:
> Trace how a delivery is recorded: router -> service -> domain -> repository -> database.
> Say where validation happens, where state changes, which tests cover it.
> Do not modify files.

## Check what the agent found
For every important claim ask for: file, function, what it does now, evidence, what is still unsure.
You open the file for the one or two claims that the plan depends on.

## Long chats get cluttered
After many steps, a chat holds old decisions and noise. So:
- Keep facts in files (docs, decisions, notes), not only in chat.
- Start a fresh session at a natural break (after a finished step).
- In the new session, paste the session notes, then make the agent re-read the real code.
  Notes are a map, not proof (`templates/session-notes.md`).

## Context refresh prompt
> Read AGENTS.md and docs/notes/<file>. Then run `git status` and `git log -5`, and look at the
> files named in the notes. Tell me: what is done, what is left, and anything in the repo that
> does not match the notes. Do not change anything yet.
