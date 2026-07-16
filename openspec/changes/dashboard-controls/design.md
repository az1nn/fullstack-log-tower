## Approach
- Keep backend `GET /api/metrics` as-is (already accepts startDate/endDate and
  returns `distribution` + `trends`). For per-level trends, transform the
  returned `distribution` + `trends` client-side: build a per-day series keyed
  by level. Since the current endpoint returns only aggregate daily counts, add
  a `trendsByLevel` shape by extending the backend to group by day AND level, OR
  derive client-side from a new endpoint field. Decision: extend the backend
  metrics route to also return `trendsByLevel: { date, INFO, WARN, ERROR, ... }`
  via a SQL group-by, keeping the aggregate `trends` for the existing chart.

## Key Decisions
- Backend adds `trendsByLevel` (pivoted daily counts per level) to the metrics
  response. Frontend renders one `Line` per level using the `COLORS` map.
- Date presets computed client-side; custom range uses two date inputs.
- Auto-refresh via `setInterval` cleared on unmount; respects current range.

## Risks
- Pivoting in SQL requires conditional aggregation; keep it in `$queryRaw`.
