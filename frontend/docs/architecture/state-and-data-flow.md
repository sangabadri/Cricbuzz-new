# State Management & Data Flow

This document details how data flows through the React application, how server state is managed with TanStack Query, and how local UI state is encapsulated.

---

## 1. State Categories & Rules

| State Kind | Tool | Examples | Rules |
|---|---|---|---|
| **Server State** | TanStack Query v5 | Matches, Scorecards, Squads, Live Ball State | Fetched via hooks; cached in QueryClient; **never copied into local `useState`**. |
| **Local UI State** | React `useState` | Modal open/close, active tab, form inputs | Kept in the nearest common ancestor component. |
| **URL State** | React Router (`useSearchParams`, `useParams`) | Filter status (`?status=live`), `matchId` | Shared across navigation; supports deep-linking. |
| **Session State** | `AuthContext` | Current user profile, authentication status | Hydrated on mount from refresh cookie. |

---

## 2. Server Data Flow (TanStack Query)

```text
[ API Gateway (lib/api-client.ts) ]
               ^
               | 1. cricketApi.getScorecard(matchId)
[ Custom Hook (useMatchScorecard.ts) ]
               ^
               | 2. queryKey: ['scorecard', matchId]
[ Page Component (MatchDetailPage.tsx) ]
               |
               | 3. Passes data, isLoading, isError to child components
               v
[ Presentation Component (BattingTable.tsx) ]
```

### A. Reading Data (`useQuery`)
```typescript
export function useMatchScorecard(matchId: number) {
  return useQuery({
    queryKey: ['scorecard', matchId],
    queryFn: () => cricketApi.getScorecard(matchId),
    refetchInterval: (query) => {
      // Poll every 3 seconds if match is live; disable polling if completed
      return query.state.data?.status === 'live' ? 3000 : false;
    },
  });
}
```

### B. Mutating Data (`useMutation`)
```typescript
export function useRecordDelivery(matchId: number, inningsNumber: number) {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  return useMutation({
    mutationFn: (deliveryIn: DeliveryCreate) =>
      cricketApi.recordDelivery(matchId, inningsNumber, deliveryIn),
    onSuccess: () => {
      // Invalidate queries so UI reflects updated score immediately
      queryClient.invalidateQueries({ queryKey: ['scorer-state', matchId] });
      queryClient.invalidateQueries({ queryKey: ['scorecard', matchId] });
    },
    onError: (err) => {
      notify(getApiErrorMessage(err), 'error');
    },
  });
}
```

### Invariants:
1. **Always Invalidate Queries**: After mutations succeed, call `queryClient.invalidateQueries(...)`. Do not manually patch the cache unless explicitly approved for high-frequency optimizations.
2. **Handle All Three States**: Every page consuming a query must explicitly handle:
   - `isLoading`: Render loading skeleton or spinner.
   - `isError`: Render `getApiErrorMessage(error)` in an error banner.
   - Empty data: Render empty state message (e.g. `EmptyState`).
