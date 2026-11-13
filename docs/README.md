# Project Knowledge Base (`docs/`)

This directory contains durable **project-specific knowledge** for Cricbuzz Tracker. 

For the **agentic engineering workflow** (task sizing, checklists, templates, and review loop), refer to the workspace skill: [`.agents/skills/agentic-engineering/`](../.agents/skills/agentic-engineering/).

---

## Directory Map

| Directory | What is inside |
|---|---|
| `domain/` | Cricket rules, match invariants, crease state, and scoring laws in plain words (`cricket-rules.md`). |
| `decisions/` | Architectural Decision Records (ADRs 0001 through 0007) documenting key system designs and trade-offs. |
| `notes/` | Session handoffs and milestone tracking across agent sessions. |
| `examples/` | Worked domain examples of cricket scoring lifecycles. |
| `backend/docs/` | Backend architecture guides, code patterns, and technical debt registers (`known-problems.md`). |
| `frontend/docs/` | Frontend feature structure, folder map, component rules, and UI debt registers (`known-problems.md`). |

---

## Which File is the Boss?

1. The human's active instruction.
2. `AGENTS.md` rules.
3. Decision records (`docs/decisions/`).
4. Other documentation.
5. Chat history (weakest, can be outdated).

For *how the system behaves right now*, the source code and automated tests are the truth. If a document and the code disagree, report it rather than silently picking one.
