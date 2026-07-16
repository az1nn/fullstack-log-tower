## MODIFIED Requirements

### Requirement: Deploy backend on Render
- The Render deploy continues to use the standalone entry (`src/server.ts`
  = CLI defaults). The same build also produces the installable `log-tower`
  package (CLI + `dist`), usable as a local dev dependency by other apps.

### Requirement: Observability configuration
- The package is additionally configurable via CLI flags at runtime:
  `--tail <files...>` (tail log files), `--port <3333>`, `--db <url>`
  (override `DATABASE_URL`), `--ui` (serve built frontend). No new env vars
  beyond what the backend already reads.

#### Scenario: Host app setup
- **WHEN** a host app (OpenBand) installs `log-tower`
- **THEN** it adds the `Log` model + `LogLevel` enum + indexes to its own
  Prisma schema, sets `DATABASE_URL`, runs `prisma generate` + `migrate deploy`,
  and runs the CLI (e.g. `npm run logs -- --tail ./openband.log`) to observe logs
