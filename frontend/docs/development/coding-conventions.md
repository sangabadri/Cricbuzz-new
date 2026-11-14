# Frontend Coding Conventions, Styling & UI Design

This document details the component architecture, typing standards, Tailwind CSS v4 design tokens, and accessibility (a11y) rules for the React frontend.

---

## 1. Component Design Rules

Every UI component must follow this contract:
1. **Typed Props In, Callbacks Out**: Define an explicit `XProps` interface containing only what the component needs.
2. **Zero Internal Data Fetching**: A presentation component never calls `cricketApi` or hooks directly. Data is passed as props from parent pages or container components.
3. **Handle Empty States**: Always check for empty arrays or missing data before rendering markup.
4. **Size Limits**:
   - Aim for **under 150 lines** per component file.
   - Files exceeding **250 lines** must be decomposed by sub-component responsibility.

### Good Component Pattern (`src/features/matches/components/BattingTable.tsx`):
```tsx
export interface BattingTableProps {
  batters: BatterScorecard[];
  extras?: ExtrasBreakdown;
  className?: string;
}

export function BattingTable({ batters, extras, className = '' }: BattingTableProps) {
  if (batters.length === 0) {
    return <p className="text-muted text-sm py-4 text-center">No batting data available</p>;
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-left text-sm">
        {/* Table headers and rows */}
      </table>
    </div>
  );
}
```

---

## 2. Tailwind CSS v4 Theme Colors & Design Tokens

Define color tokens once in `src/index.css` using the `@theme` directive. Use named color classes rather than literal hex values:

```css
@import "tailwindcss";

@theme {
  --color-page: #090c10;       /* Page background */
  --color-panel: #161b22;      /* Cards, panels, table backgrounds */
  --color-panel-alt: #12161f;  /* Alternate rows, subheaders */
  --color-line: #21262d;       /* Borders and dividers */
  --color-text: #f0f6fc;       /* Primary text */
  --color-muted: #94a3b8;      /* Secondary/placeholder text */
  --color-accent: #38bdf8;     /* Highlights, active batter, primary links */
  --color-good: #34d399;       /* Boundaries (4s, 6s), success toasts */
  --color-warn: #fbbf24;       /* Extras, warnings */
  --color-bad: #f87171;        /* Wickets, errors, alerts */
}
```

### Class Mapping:
- Backgrounds: `bg-page`, `bg-panel`, `bg-panel-alt`
- Borders: `border-line`
- Text: `text-text`, `text-muted`, `text-accent`, `text-good`, `text-bad`
- Numbers: Apply `tabular-nums font-score` so digits line up evenly on scorecards.

---

## 3. Accessibility (a11y) & Scorer Ergonomics

1. **Semantic Elements**: Use `<button>` for actions, `<a>` or React Router `<Link>` for navigation. Never create clickable `<div>` elements.
2. **Form Accessibility**: All `<input>` and `<select>` elements must have a visible `<label>` or an `aria-label`.
3. **Dialog Modals**: Modals must carry `role="dialog"`, `aria-modal="true"`, trap focus, and close on the `Escape` key.
4. **Scorer Thumb Ergonomics**: Keypad buttons and scoring controls must have a touch target height of at least **44px** (`min-h-[44px]`) to support rapid one-handed mobile scoring.
5. **Color Independence**: Never convey information with color alone. Always provide accompanying text labels or status icons.
