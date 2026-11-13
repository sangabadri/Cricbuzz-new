# Styling and UI

## Tailwind CSS v4
Style with utility classes in `className`. A small amount of custom CSS lives in `src/index.css`
(base styles, score fonts, animations).

## Theme names, not hex colors
Today many files use literal colors like `bg-[#161b22]` and `border-[#21262d]`. That makes a redesign painful.
New code must use named theme colors. Define them once in `index.css`:
```css
@import "tailwindcss";

@theme {
  --color-page: #090c10;       /* page background */
  --color-panel: #161b22;      /* cards, tables */
  --color-panel-alt: #12161f;  /* alternate rows, headers */
  --color-line: #21262d;       /* borders */
  --color-text: #f0f6fc;
  --color-muted: #94a3b8;
  --color-accent: #38bdf8;     /* highlight, current batter */
  --color-good: #34d399;
  --color-warn: #fbbf24;
  --color-bad: #f87171;
}
```
Then write `bg-panel`, `border-line`, `text-muted`. Adding or changing a theme color needs approval.
Old files switch to names only when they are touched for another reason, or in a style-only task.

## Shared pieces (`components/ui/`)
Build small shared pieces once, and reuse them: `Button`, `Modal`, `Badge`, `Card`, `Input`, `Select`, `Table`, `Tabs`,
`EmptyState`, `Skeleton`, `Toast`. Before writing a new button or card style, look here.
A shared piece: few props, no feature knowledge, no data fetching.
Create one only when a second place needs it. Not before.

## Look and feel
- Dark, high-contrast scoring look. Numbers use `tabular-nums` so digits line up.
- Score numbers: use the existing `font-score`. Do not add new fonts.
- Spacing and sizes: use Tailwind steps (`p-4`, `gap-3`, `text-sm`). No random pixel values.
- Status colors mean the same everywhere (live = accent/red badge, completed = muted, wicket = bad).

## Layout and screens
- Mobile first: design for a phone, then add `md:` and `lg:` changes.
- The scorer console is used with thumbs: buttons at least 44px tall, nothing tiny near the keypad.
- Tables that are wide scroll sideways inside their own box (`overflow-x-auto`), the page itself does not scroll sideways.

## Accessibility basics
- Interactive things are buttons or links, not clickable `div`s.
- Inputs have a visible label or `aria-label`.
- Modals: `role="dialog"`, a title, close with Escape, focus goes inside when opened.
- Color is never the only signal (add text or an icon). Text contrast stays readable.
- Icons come from `lucide-react`. Icon-only buttons get an `aria-label`.

## Do not
- Add a UI library, CSS-in-JS, or a second styling method.
- Add inline `style={{...}}` for things Tailwind does.
- Add new hard-coded hex colors.
