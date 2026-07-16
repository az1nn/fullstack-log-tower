## Why
The Dashboard always shows the last 30 days and a single aggregate trend line.
Users want to choose a custom date range and see how each severity contributes
to volume over time, plus keep the view fresh during live incidents.

## What Changes
- Frontend: add a date-range picker (presets: 24h, 7d, 30d, custom) that drives
  `GET /api/metrics?startDate&endDate`.
- Frontend: replace the single trend line with per-level trend lines (multiple
  `Line` series) so the line chart shows volume by severity.
- Frontend: add a "Refresh" button and optional auto-refresh toggle (e.g. every
  30s).

## Impact
- `frontend/src/pages/Dashboard.tsx`
- `openspec/specs/frontend/spec.md`
