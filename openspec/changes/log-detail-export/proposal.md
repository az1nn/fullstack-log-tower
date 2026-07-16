## Why
Operators investigating incidents need to read a full log message without
truncation and to copy or export the filtered result set for sharing in tickets
or postmortems. The current Logs table truncates messages and offers no way to
extract data.

## What Changes
- Frontend: clickable row that expands (or opens a right-side drawer) showing the
  full log (timestamp, level, service, full message).
- Frontend: highlight the active text-search term inside the message.
- Frontend: "Export CSV" and "Export JSON" buttons that download the current
  filtered query results (respecting active filters, current page or all pages).

## Impact
- `frontend/src/pages/Logs.tsx`
- New helper `frontend/src/lib/export.ts`
- `openspec/specs/frontend/spec.md`
