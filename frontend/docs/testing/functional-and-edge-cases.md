# Frontend Functional & Edge-Case Testing

This document details how to verify functional requirements, UI edge cases, form validations, empty states, and responsive layouts in the React application.

---

## 1. UI Boundary & Empty-State Testing

Every screen that loads server data must be tested for edge-case and boundary data:

| Component | Boundary / Edge Scenario | Expected UI Render | Target Test |
|---|---|---|---|
| `BattingTable` | Empty batters array (`batters = []`) | Displays `"No batting data available"`. | `BattingTable.test.tsx` |
| `BowlingTable` | Empty bowlers array (`bowlers = []`) | Displays `"No bowling data available"`. | `BowlingTable.test.tsx` |
| `MatchList` | No matches matching filter (`?status=live`) | Displays `EmptyState` component with guidance text. | `FixtureCardsAndSetupForms.test.tsx` |
| `DeliveryKeypad`| Keypad during wicket pending state | Wicket modal opens; keypad pauses delivery input. | `DeliveryKeypad.test.tsx` |
| `CreaseHud` | Striker vs Non-Striker visual differentiation | Striker indicator has `*` symbol and distinct highlight. | `ScorerCreaseAndModals.test.tsx` |
| `PlayingXISelector`| Selecting 12th player | Checkbox disabled or error alert shown. | `FixtureCardsAndSetupForms.test.tsx` |

---

## 2. Form Validation & Interaction Testing

Test user interactions using `@testing-library/user-event`:

### A. Team Creation Form Validation
```tsx
it('displays error message when team short code is empty', async () => {
  render(<CreateTeamForm onSubmit={mockSubmit} />);
  
  const submitButton = screen.getByRole('button', { name: /create team/i });
  await userEvent.click(submitButton);

  expect(screen.getByText(/short code is required/i)).toBeInTheDocument();
  expect(mockSubmit).not.toHaveBeenCalled();
});
```

### B. Modal Dialog Keyboard & Focus Testing
- Verify that pressing `Escape` invokes `onClose()`.
- Verify that clicking outside modal overlay triggers dismissal (if configured).
- Verify that opening a modal traps focus inside the modal boundary.

---

## 3. Responsive & Touch Target Testing

- Verify that scoring buttons have minimum touch dimensions:
  ```tsx
  const ballButton = screen.getByRole('button', { name: '4' });
  expect(ballButton).toBeVisible();
  ```
- Wide tables (e.g. `BattingTable`, `BowlingTable`) must wrap in an element with `overflow-x-auto` to prevent viewport horizontal scrolling on mobile viewports.
