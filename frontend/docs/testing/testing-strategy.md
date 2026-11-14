# Frontend Testing Strategy

This document describes the testing tools, test structure, element query conventions, and execution commands for the React frontend.

---

## 1. Testing Tools & Setup

- **Test Runner**: Vitest (`vitest run`).
- **DOM Simulation**: `jsdom`.
- **Component Testing**: `@testing-library/react` and `@testing-library/user-event`.
- **DOM Matchers**: `@testing-library/jest-dom`.
- **Global Setup File**: `frontend/src/test/setup.ts`.

---

## 2. Testing Philosophy: What a Person Sees & Does

Tests should interact with rendered components the way a real user does:

```tsx
// Good: Queries by visible text and semantic accessible roles
render(<BattingTable batters={[]} />);
expect(screen.getByText('No batting data available')).toBeInTheDocument();

const saveButton = screen.getByRole('button', { name: /save/i });
await userEvent.click(saveButton);
```

### Avoid Asserting on CSS Classes or DOM Tree Internals:
- **Fragile**: `expect(element).toHaveClass('border-[#38bdf8]')` breaks whenever visual theme colors are refactored.
- **Robust**: Assert on visible content, semantic states (`toBeDisabled()`, `toBeVisible()`), and user-perceptible changes.

---

## 3. What to Test by Level

| Level | What is Tested | How It Is Tested |
|---|---|---|
| **Component** | Renders expected props; handles empty data; fires user action callbacks. | Render with mock props; trigger events with `userEvent`. |
| **Hook** | Initial loading state; successful data receipt; error state handling. | Wrap with `QueryClientProvider` and mock `cricketApi` method. |
| **Page** | Main user flow: URL param -> query -> render children -> form submission. | Mount with MemoryRouter and QueryClientProvider. |
| **API Client** | Correct HTTP verb, endpoint URL, query params, and body payload. | Mock Axios adapter in `src/lib/__tests__/api-client.test.ts`. |
| **Pure Helpers** | Input-to-output accuracy. | Pure function assertion (e.g. `teamColors.test.ts`). |

---

## 4. Execution Commands

```powershell
cd frontend

# Run all 131 tests once:
npm test -- --run

# Run tests in watch mode:
npm run test:watch

# Run linter:
npm run lint

# Run TypeScript compile and Vite build check:
npm run build
```
All tests must pass before declaring work complete.
