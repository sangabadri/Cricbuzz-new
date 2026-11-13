# Data and API

## One door to the backend
`api/client.ts` (target: `lib/api-client.ts`) holds the axios instance, `getApiErrorMessage`, and the `cricketApi` functions.
Only this file talks to the backend. Base URL: `/api/v1` (Vite proxies `/api` to `http://localhost:8000` in dev).

## Layers
```
component  ->  hook (TanStack Query)  ->  cricketApi function  ->  axios  ->  backend
```

## Reading data (query)
```ts
export function useMatchList() {
  return useQuery({
    queryKey: ['matches'],
    queryFn: () => cricketApi.getMatches(),
  });
}
```
- `queryKey` names the data. Include every value the data depends on: `['match', matchId]`, `['scorer-state', matchId, inningsNumber]`.
- The caller gets `data`, `isLoading`, `isError`, `error`. The screen shows all three states.
- Live screens should refetch on an interval (`refetchInterval`) instead of hand-written timers.

## Changing data (mutation)
```ts
const queryClient = useQueryClient();
return useMutation({
  mutationFn: (input: DeliveryCreate) => cricketApi.recordDelivery(matchId, inningsNumber, input),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scorer-state', matchId] }),
  onError: (err) => notify(getApiErrorMessage(err), 'error'),
});
```
After a change, **invalidate** the queries that show it. Do not patch the cache by hand unless needed for speed and approved.

## Errors
- Show `getApiErrorMessage(err)`. The backend sends `{ "detail": "..." }` with a sentence for a person.
- 400 = a rule was broken (show the message). 404 = not found. 5xx or no response = "something went wrong, try again".
- Never swallow an error silently.

## Types
`types/cricket.ts` mirrors backend response shapes: same field names (snake_case as sent), same optional fields.
If a backend schema changes, update the type and every place that uses it in the same task.
Do not use `any`. Use `unknown` and narrow it.

## Adding an endpoint call
1. Type for request and response in `types/`.
2. Function in `cricketApi` (one line each: method + path + typed result).
3. Hook in the feature's `hooks/`.
4. Use the hook in the page.
5. Test: mock the api function, not axios internals.

## Do not
- Call `axios` or `fetch` from components or pages.
- Re-calculate scores, overs, strike or wickets on the client.
- Create a second axios instance.
