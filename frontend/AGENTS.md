# Frontend rules

React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query, axios, React Router, Vitest + Testing Library.
Read `/AGENTS.md` first. This file adds the frontend rules.

## The idea in one picture
```
pages  ->  feature components  ->  shared ui components
  |               |
  v               v
hooks  ->  api client (the ONLY place that calls the backend)  ->  backend
types = the shapes the backend sends     lib/utils = small pure helpers
```
- A **page** is one screen for one URL. It joins pieces together. It stays short.
- A **component** shows things. Data comes in as props, user actions go out as callbacks.
- A **hook** (`useSomething`) gets data or does actions. It uses TanStack Query.
- The **api client** is the only code that talks to the backend.

Details: `docs/folder-map.md`, `docs/component-rules.md`, `docs/data-and-api.md`,
`docs/styling-and-ui.md`, `docs/testing.md`, `docs/adding-a-screen.md`.

## Hard rules
1. Components and pages never call axios or `fetch`. They use a hook that uses the api client.
2. **Do not re-implement cricket rules.** Runs, overs, strike rotation, who is out: the backend decides, the
   screen shows what it returns. If the screen needs something the backend does not send, that is a
   backend change (Stop and ask).
3. Every screen that loads data handles **loading, empty, and error** states.
4. Use `getApiErrorMessage` from the api client to read errors. Do not write another copy.
5. Types in `src/types` match the backend response shapes exactly. Change both sides in the same task.
6. No new libraries without approval. No global state library.
7. Do not add new auth screens or gates without an approved design plan (decision 0005).
8. Colors come from theme names (`docs/styling-and-ui.md`). Do not add new hard-coded hex colors.

## Size limits
- Component file: aim for 150 lines. Over 250 is a problem: split it.
- One main component per file. File name = component name.
- A hook does one job. A hook over 200 lines should be split.
- Do not make an already-large file larger. See `docs/known-problems.md`.

## Naming (simple and consistent)
| Thing | Style | Example |
|---|---|---|
| Component file and name | `PascalCase.tsx` | `BattingTable.tsx` |
| Props type | `<Component>Props` | `BattingTableProps` |
| Hook | `useThing.ts` | `useMatchList.ts` |
| Other code files | `camelCase.ts` | `teamColors.ts` |
| Folders | `kebab-case` or single word | `match-center` |
| Test file | `<Thing>.test.tsx` inside `__tests__/` next to it | `BattingTable.test.tsx` |
| Event props | `onSomething` | `onSelectPlayer` |
| Yes/no values | start with `is`, `has`, `can` | `isLoading`, `hasWickets` |
Use plain, clear English. Test names describe behaviour ("shows 'No batting data available' when list is empty"),
not project stages (no `milestone4` or `stage2` names).

## Before you finish
`npm run lint`, `npm test`, `npm run build` all pass, on the final code (inside `frontend/`).
Look at the screen in the browser: at phone width and desktop width, with data, with no data, with the backend off.

## Where to start when adding something
`docs/adding-a-screen.md` (step order) and the model files listed there.
