# 0006: Frontend: feature folders, server data via TanStack Query

- Status: Accepted
- Date: 2026-11-12

## Decision
- Code is grouped by feature (matches, scoring, setup, home), not only by file kind.
- Data from the backend is fetched with TanStack Query. Only the API client talks to axios.
- Small local UI state uses `useState`. No global state library unless approved.
- Shared building blocks (buttons, modal, badges) live in `components/ui`.
- Cricket rules are NOT re-implemented in the frontend. The backend decides; the frontend shows.

Details: `frontend/docs/folder-map.md`, `frontend/docs/data-and-api.md`.

## Other options considered
- Keep file-kind folders (components/pages/hooks): fine for 20 files, gets messy at 60+.
- Redux or similar: no shared client state that needs it today.

## Results
Good: a feature can be understood by opening one folder.
Costs: old code is still in the old layout. Move it only in dedicated move-only tasks.
