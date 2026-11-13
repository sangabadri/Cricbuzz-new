# Component rules

## What a component does
Takes props, shows UI, calls callbacks. Not more.

```tsx
export interface BattingTableProps {
  batters: BatterScorecard[];
  extras?: ExtrasBreakdown;
  className?: string;
}

export function BattingTable({ batters, extras, className = '' }: BattingTableProps) {
  if (batters.length === 0) return <p>No batting data available</p>;
  return (...);
}
```
(`components/match/BattingTable.tsx` is a good model: typed props, empty state, no data fetching.)

## Checklist for every component
- [ ] Props have a named type (`XProps`), with only what the component needs.
- [ ] No data fetching inside (a hook in the page or a parent does that).
- [ ] No cricket rule calculations. Display what you are given. Simple formatting is fine (`8.5 overs`).
- [ ] Handles empty / missing data.
- [ ] Buttons are `<button>`, links are `<a>` or router links, inputs have labels.
- [ ] Lists have a stable `key` (an id, not the array index).
- [ ] Works at phone width.

## When to split a component
- It is longer than ~250 lines, or
- It has two jobs (for example "form" and "list"), or
- Part of it is reused, or
- You cannot name it in two or three words.
Split by *what it shows*, not by arbitrary line counts.

## Pages
A page: read the URL parameters, call hooks, choose which components to show, and handle loading / error / empty.
No big markup blocks and no business logic in a page. If a page is long, move parts into components.

## Modals
A modal owns its own open state through a small hook or a prop pair (`isOpen`, `onClose`). It gets data in, sends the result
out through `onSubmit`. It does not call the api itself.

## State
| Kind | Use |
|---|---|
| Data from the backend | TanStack Query (in hooks) |
| Form fields, open / closed, selected tab | `useState` in the nearest component that needs it |
| Shared across many screens | Ask first. Usually the URL or the query cache is the right place |
Do not copy server data into `useState`. Use the query result directly.

## Effects
Avoid `useEffect` for things that can be calculated during render or done in an event handler. Use it for real
side effects only (timers, subscriptions). Keep the dependency list correct (`exhaustive-deps` lint warns).

## Error boundaries
Keep `ErrorBoundary` around each page so one broken screen does not blank the app.
