# OpenBand ↔ log-tower Handoff

This document explains how **OpenBand** (the host app) uses **log-tower** as a
local dev dependency to observe its own logs. log-tower is the existing
fullstack log-analysis app, repackaged as an installable CLI.

## What log-tower is
- A Fastify backend (upload / push / tail ingest, `GET /api/logs`,
  `GET /api/metrics`, `GET /api/health`) + a React dashboard/logs UI.
- Runs locally as a CLI: `npx log-tower` boots the server and serves the UI
  at `http://localhost:3333/` (similar to `vitest --ui`).
- Persists logs in PostgreSQL via Prisma, using a `Log` table.

## Two ways OpenBand feeds logs in
1. **File tail (recommended):** run `log-tower --tail ./openband.log`.
   log-tower tails the file and ingests new lines live (handles rotation).
2. **HTTP push:** from OpenBand code, POST log lines to
   `http://localhost:3333/api/logs/push` as `text/plain` (newline-delimited
   lines in `[ts] [LEVEL] msg (service=name)` format) or as a JSON array
   `[{ timestamp, level, message, service? }]`.

Both write to the same `Log` table, so the dashboard/logs UI shows them.

## OpenBand setup (one-time)
1. **Install:** `npm i -D log-tower` (or `npm i -D <registry-path>`).
2. **Prisma schema:** add the following to OpenBand's `prisma/schema.prisma`
   (log-tower reads the same `DATABASE_URL`; the model must live in OpenBand's
   schema because Prisma client generation is app-local):
   ```prisma
   enum LogLevel {
     INFO
     WARN
     ERROR
     DEBUG
     FATAL
   }

   model Log {
     id        String   @id @default(uuid())
     timestamp DateTime
     level     LogLevel
     message   String
     service   String?
     createdAt DateTime @default(now())

     @@index([timestamp])
     @@index([level])
     @@index([service])
   }
   ```
3. **Database + client:** set `DATABASE_URL` (same DB log-tower uses), then:
   ```
   npx prisma generate
   npx prisma migrate deploy
   ```
4. **Add a script** in OpenBand's `package.json`:
   ```json
   {
     "scripts": {
       "logs": "log-tower --tail ./openband.log --port 3333"
     }
   }
   ```
   Or push from code:
   ```ts
   const res = await fetch('http://localhost:3333/api/logs/push', {
     method: 'POST',
     headers: { 'Content-Type': 'text/plain' },
     body: '[2026-01-01T00:00:00.000Z] [ERROR] boom (service=openband)\n',
   })
   ```

## Running it
```
# terminal 1 — OpenBand
npm run dev

# terminal 2 — log observer
npm run logs          # tails ./openband.log
# open http://localhost:3333/  → Dashboard + Logs
```
Or without a file, just stream via HTTP push while the UI is open.

## Notes / constraints
- log-tower is a **local dev tool** here; it does not replace OpenBand's own
  logging. It observes whatever OpenBand writes/pushes.
- The UI polls `GET /api/logs` on its normal refresh; tail/push rows appear on
  the next poll (live SSE streaming is a future enhancement).
- No new runtime dependencies are added to log-tower; tailing uses Node
  built-ins.
- Keep OpenBand's `Log`/`LogLevel` schema in sync with log-tower's; if
  log-tower changes the model, re-run `prisma migrate deploy` in OpenBand.
