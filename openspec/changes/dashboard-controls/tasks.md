## 1. Backend: per-level trends
- [ ] Extend `metrics.ts` to return `trendsByLevel: Array<{ date: string; INFO: number; WARN: number; ERROR: number; DEBUG: number; FATAL: number }>` via a pivoted `$queryRaw` grouped by day and level.
- [ ] Keep existing `trends` and `distribution` for backward compatibility.

## 2. Frontend: date-range controls
- [ ] Add preset buttons (24h / 7d / 30d / custom) and two date inputs.
- [ ] Pass `startDate`/`endDate` to `GET /api/metrics`.

## 3. Frontend: per-level trend chart
- [ ] Render one `Line` per level in the line chart using the `COLORS` map.
- [ ] Update legend to show severity names.

## 4. Frontend: refresh
- [ ] Add a "Refresh" button and an auto-refresh toggle (30s) using `setInterval`, cleaned up on unmount.

## 5. Specs
- [ ] Update `openspec/specs/backend/spec.md` metrics requirement with `trendsByLevel`.
- [ ] Update `openspec/specs/frontend/spec.md` dashboard requirement with controls + per-level lines.
