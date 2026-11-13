# Adding a screen or feature: the order

1. **Task brief.** What does the person see and do? What happens when there is no data, or an error?
2. **Backend ready?** The endpoint must exist and its response is known. If not, that is a backend task first.
   Frontend work against a written contract is allowed in large work, with fake data clearly marked.
3. **Types** in `types/` for the response (match backend exactly).
4. **API function** in `cricketApi`.
5. **Hook** in `features/<feature>/hooks/`: query or mutation; returns what the screen needs.
6. **Small components** in `features/<feature>/components/`: props in, callbacks out, empty state handled.
   Reuse `components/ui` pieces.
7. **Page** in `features/<feature>/pages/`: URL params, hook, loading / error / empty, then compose components.
8. **Route** in `app/router.tsx` (shared file: edit it last, and only the one route).
9. **Tests**: component tests, hook test with mocked api, page flow test.
10. **Run** `npm run lint`, `npm test`, `npm run build`.
11. **Look at it** in a browser: phone and desktop width, with data, no data, backend off.
12. **Docs**: if you made a new shared piece or pattern, add a line to `styling-and-ui.md` or `folder-map.md`.

## Good models in this repo
| For | Copy from |
|---|---|
| Component with props and empty state | `components/match/BattingTable.tsx` |
| Component test | `components/match/__tests__/BattingTable.test.tsx` (but check by text, not class) |
| Hook that composes smaller hooks | `hooks/useScorer.ts` |
| Modal pieces | `components/scorer/modals/` |
| Error boundary | `components/common/ErrorBoundary.tsx` |
| API client | `api/client.ts` |

## Questions before finishing
- Did I add a second way to do something that already has a way?
- Did I copy server data into state?
- Did I calculate something the backend already gives me?
- Is every state (loading, empty, error) visible to the person?
