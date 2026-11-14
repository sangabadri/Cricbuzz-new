# Frontend Failure, Network & Integration Testing

This document details how to verify API failures, network interruptions, error boundaries, and asynchronous integration in the React application.

---

## 1. Error Boundary Verification (`ErrorBoundary.tsx`)

To ensure that a runtime error in one component does not crash the entire application:

### Test Pattern (`frontend/src/components/common/__tests__/ErrorBoundary.test.tsx`):
```tsx
const ThrowingComponent = () => {
  throw new Error('Explosive component crash');
};

it('catches rendering errors and shows fallback UI with retry button', () => {
  render(
    <ErrorBoundary>
      <ThrowingComponent />
    </ErrorBoundary>
  );

  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
});
```

---

## 2. API Error Extraction & Toast Notifications

When a mutation or query fails, the user must receive clear feedback:

```tsx
it('extracts backend error message and emits toast on delivery failure', async () => {
  vi.spyOn(cricketApi, 'recordDelivery').mockRejectedValue({
    isAxiosError: true,
    response: { status: 400, data: { detail: 'Bowler cannot bowl consecutive overs' } },
  });

  render(<DeliveryKeypad matchId={1} inningsNumber={1} />);
  await userEvent.click(screen.getByRole('button', { name: '1' }));

  expect(await screen.findByText('Bowler cannot bowl consecutive overs')).toBeInTheDocument();
});
```

---

## 3. Concurrent 401 Token Refresh Testing (`api-client.test.ts`)

To ensure that parallel requests hitting 401 do not trigger multiple refresh calls:

### Test Scenario:
1. Mock backend `/api/v1/matches/` and `/api/v1/teams/` to return `401 Unauthorized`.
2. Mock `/api/v1/auth/refresh` to return `200 OK` with `{ access_token: "new-token" }`.
3. Fire `getMatches()` and `getTeams()` concurrently using `Promise.all()`.
4. **Assert**:
   - `/api/v1/auth/refresh` was called **exactly once**.
   - Both original requests were retried with the new `Authorization: Bearer new-token` header.
   - Both requests resolve successfully.
