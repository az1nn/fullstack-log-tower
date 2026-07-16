## Why
The current Logs page only supports free-text search and pagination. Users need to
narrow results by severity, time window, and service to investigate incidents
efficiently. The backend `GET /api/logs` already supports `level`, `search`,
`startDate`, `endDate` but the frontend does not expose them, and `service` is
not filterable yet.

## What Changes
- Backend: add `service` and `levels` (multi-level) query params to `get-logs`.
- Frontend: add a filter bar to the Logs page with level multi-select, service
  input, and date-range pickers; wire them into the `/api/logs` request.
- Keep existing pagination and text search.

## Impact
- `src/routes/get-logs.ts`
- `frontend/src/pages/Logs.tsx`
- `openspec/specs/backend/spec.md`, `openspec/specs/frontend/spec.md`
