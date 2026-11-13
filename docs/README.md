# Docs map

Shared docs live here. Backend and frontend have their own `docs/` folders.

| Folder | What is inside |
|---|---|
| `process/` | How to work: pick size, small / medium / large process, context, running, many agents, review |
| `templates/` | Fill-in forms: task brief, design plan, work split, review report, session notes, decision record |
| `checklists/` | Start, diff review, finish, safety |
| `decisions/` | Short records of important choices and why |
| `domain/` | Cricket rules in plain words |
| `examples/` | Filled-in examples of the process |
| `notes/` | Session notes for work that spans sessions |

## Names used here (simple words instead of textbook terms)
| Textbook term | Name used here |
|---|---|
| Task specification | Task brief |
| Acceptance criteria | "How we know it works" |
| Definition of Done | Finish checklist |
| Architecture / implementation plan | Design plan |
| Task decomposition / delegation | Work split |
| ADR (architecture decision record) | Decision record |
| Handoff | Session notes |
| Engineering constitution | Rules (AGENTS.md) |
| Guardrails | Safety limits |
| Autonomy levels 1/2/3 | Go ahead / Propose first / Stop and ask |
| Orchestration | Splitting work between agents |
| Context rot | Old chat clutter |

## Which file is the boss?
1. The human's current instruction.
2. `AGENTS.md` files.
3. Decision records.
4. Other docs.
5. Chat history (weakest, can be old).

For *how the system behaves right now*, the code and the tests win over every doc.
If a doc and the code disagree, do not silently pick one: report it.
