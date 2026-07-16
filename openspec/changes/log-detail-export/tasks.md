## 1. Log detail view
- [ ] Make each log row clickable to expand a detail panel showing full timestamp, level, service, and untruncated message.
- [ ] Highlight the active search term within the message (case-insensitive).
- [ ] Close/expand toggling; only one row expanded at a time (or allow multiple).

## 2. Export helpers
- [ ] Create `frontend/src/lib/export.ts` with `downloadCsv(rows: Log[])` and `downloadJson(rows: Log[])`.
- [ ] CSV escaping for messages containing commas/quotes/newlines.

## 3. Export buttons in Logs page
- [ ] Add "Export CSV" and "Export JSON" buttons in the toolbar.
- [ ] Export current page using currently loaded `logs`.
- [ ] Add "Export all (filtered)" that re-fetches all matching rows with current filters and downloads them.
- [ ] Cap exported rows at 10k; indicate truncation in filename if exceeded.

## 4. Specs
- [ ] Update `openspec/specs/frontend/spec.md` requirement "Log explorer with search" to include detail + export.
