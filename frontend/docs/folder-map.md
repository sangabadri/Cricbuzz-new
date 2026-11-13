# Folder map

## Target layout (new code goes here)
```
frontend/src/
├── app/                  # app shell: routes, providers, layout
│   ├── App.tsx
│   ├── router.tsx
│   └── providers.tsx     # QueryClient, Toast, ...
├── features/             # one folder per area of the product
│   ├── home/             # match list (live, scheduled, completed)
│   ├── match-center/     # spectator view: live, scorecard, commentary, squads
│   ├── scoring/          # scorer console: keypad, crease, modals
│   └── setup/            # create team, create player, schedule match, playing XI
│       └── <feature>/
│           ├── pages/        # one file per screen
│           ├── components/   # pieces used only in this feature
│           ├── hooks/        # data + actions for this feature
│           └── __tests__/    # (or next to the file)
├── components/
│   └── ui/               # small shared pieces used by 2+ features (Button, Modal, Badge, Toast, ErrorBoundary...)
├── lib/                  # api client, error helper, shared pure helpers
│   ├── api-client.ts
│   └── ...
├── types/                # backend shapes (cricket.ts)
├── styles/ or index.css  # Tailwind import + theme names
└── test/                 # test setup and shared test helpers only
```

## Where does this go?
| It is... | Put it in |
|---|---|
| A screen with its own URL | `features/<feature>/pages/` |
| A piece used by only one feature | `features/<feature>/components/` |
| A piece used by two or more features | `components/ui/` |
| Getting or changing backend data | `features/<feature>/hooks/` (calls `lib/api-client`) |
| A function with no React in it | `lib/` (shared) or next to its feature |
| A type for a backend response | `types/` |

Rule: a feature may import from `components/ui`, `lib`, `types`. A feature must **not** import another feature's
internals. If two features need the same piece, move it to `components/ui` or `lib` in a move-only task.

## Where the code is today
The code is still in the older layout (`pages/`, `components/{common,match,scorer,setup}`, `hooks/`, `api/`, `utils/`).

Mapping from old to new:
| Old | New |
|---|---|
| `pages/Home.tsx` | `features/home/pages/` |
| `pages/MatchCenter.tsx`, `components/match/*` | `features/match-center/` |
| `pages/ScorerConsole.tsx`, `components/scorer/*`, `hooks/useScorer*.ts` | `features/scoring/` |
| `pages/SetupWizard.tsx`, `components/setup/*` | `features/setup/` |
| `components/common/*`, `components/Navbar.tsx` | `components/ui/` (Navbar in `app/`) |
| `api/client.ts` | `lib/api-client.ts` |
| `utils/teamColors.ts` | `lib/teamColors.ts` |
| `test/__tests__/*` | next to what they test (see `known-problems.md`) |

## Moving is its own task
- New code goes to the target layout right away.
- Old code moves only in a **move-only task**: one feature at a time, no behaviour change, only file moves and import
  updates. Tests must pass before and after. One commit per feature.
- Never combine moving with new features, redesigns or fixes.
