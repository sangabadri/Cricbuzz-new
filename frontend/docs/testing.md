# Frontend testing

Tools: Vitest, Testing Library (`@testing-library/react`), jest-dom, jsdom. Setup file: `src/test/setup.ts`.
Run: `npm test` (once), `npm run test:watch`. Also `npm run lint` and `npm run build` (this runs the TypeScript check).

## Test what a person sees and does
```tsx
render(<BattingTable batters={[]} />);
expect(screen.getByText('No batting data available')).toBeInTheDocument();
```
Find things by text, role, or label (`getByRole('button', { name: 'Save' })`). Click and type with the events the user would do.

Avoid asserting on class names or markup structure (`toHaveClass('border-[#38bdf8]')`): the test breaks when the style changes
even though nothing is wrong. Exceptions: a class that *is* the behaviour (hidden / visible) when no better handle exists.

## What to test
| Thing | Test |
|---|---|
| Component | Shows the right text for given props; empty state; a click calls the callback |
| Hook with data | Wrap in a `QueryClientProvider`, mock the api function, check loading -> data and loading -> error |
| Page | Main flow: loads, shows data, shows error, user action leads to the right api call |
| Helper function | Plain input -> output |
| API client function | Right path, method and body for the call |

## Rules
1. Each line of "How we know it works" that touches the UI has a test.
2. Test the loading, empty and error states, not only the happy path.
3. Mock at the api function (`cricketApi.x`), not deep inside axios.
4. One idea per test, a name that says the behaviour:
   `it('shows an error message when the match cannot be loaded')`.
   No stage or milestone names in files or tests.
5. Put tests next to what they test: `features/x/components/__tests__/Thing.test.tsx`.
   Shared helpers go in `src/test/`.
6. Do not weaken or delete a test to pass. Do not use `waitFor` timeouts to hide a real problem.
7. Tests prove the screen shows what the backend sends. They do **not** re-calculate cricket results.

## Manual check (medium and large)
Open the app: the feature with data, with no data, with the backend stopped, at phone width, with the keyboard only
(Tab through it).
