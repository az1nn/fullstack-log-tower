## 1. Backend: extend get-logs filters
- [ ] Add `levels: z.array(z.nativeEnum(LogLevel)).optional()` and `service: z.string().optional()` to `getLogsQuerySchema`.
- [ ] Apply `whereClause.level = { in: levels }` when `levels` present.
- [ ] Apply `whereClause.service = { contains: service, mode: 'insensitive' }` when `service` present.
- [ ] Pass new params to `params` in the frontend request.

## 2. Frontend: filter bar in Logs page
- [ ] Add state: `selectedLevels: LogLevel[]`, `service: string`, `startDate`, `endDate`.
- [ ] Render a level multi-select (toggle chips for INFO/WARN/ERROR/DEBUG/FATAL).
- [ ] Render a service text input.
- [ ] Render two date inputs (start/end) formatted as ISO datetime for the API.
- [ ] On any filter change, reset `page` to 1 and refetch.
- [ ] Show an "active filters" count / clear button.

## 3. Specs
- [ ] Update `openspec/specs/backend/spec.md` requirement "List and filter logs" with new params.
- [ ] Update `openspec/specs/frontend/spec.md` requirement "Log explorer with search" to include filters.
