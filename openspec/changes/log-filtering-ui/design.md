## Approach
Extend the Zod query schema in `get-logs.ts` with:
- `levels`: optional array of `LogLevel` (supports `?levels=ERROR&levels=WARN`).
- `service`: optional string (case-insensitive contains on `service`).
Map these into `whereClause`. On the frontend, build a filter bar component using
Tailwind + lucide icons. State for filters lives in `Logs.tsx`; changing any
filter resets `page` to 1 and triggers refetch (already the behavior for search).

## Key Decisions
- Multi-level passed as repeated query params (Fastify/Zod `z.array`).
- Service filter reuses Prisma `contains` + `mode: insensitive` like search.
- No backend migration needed (service column already exists).

## Risks
- `service` is nullable; `contains` on null yields no match — acceptable.
