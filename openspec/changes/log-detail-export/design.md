## Approach
- Row click toggles an expanded detail panel (or a slide-over drawer using a
  fixed positioned panel). Keep it simple with an inline expandable row to avoid
  new dependencies.
- For search highlighting, split the message by the `search` term (case-insensitive)
  and render matched substrings in a highlighted span.
- Export: add `lib/export.ts` with `downloadCsv(rows)` and `downloadJson(rows)`
  that build a Blob and trigger `URL.createObjectURL` + anchor click.
- "Export all" fetches with a large `perPage` (or loops pages) using current
  filters; default to exporting the current page for simplicity, with an
  "export all (filtered)" option that fetches all matching rows.

## Key Decisions
- No backend changes needed; reuse existing `GET /api/logs`.
- CSV columns: id, timestamp, level, service, message.
- Export respects current filters by re-issuing the same query params.

## Risks
- Exporting "all" could be large; cap at a reasonable limit (e.g. 10k rows) and
  note truncation in the filename if exceeded.
