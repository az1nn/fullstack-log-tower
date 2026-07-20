## Purpose
Provide the HTTP backend that ingests large log files, stores them in PostgreSQL via Prisma, and serves paginated/filtered log queries plus aggregated dashboard metrics.

## Requirements

### Requirement: Ingest log files via upload
The system SHALL accept multipart file uploads and ingest parsed log lines into the database in batches.

#### Scenario: Successful upload
- **WHEN** a client POSTs a `.txt`/`.log` file to `/api/logs/upload` with a `file` field
- **THEN** each line matching `\[(timestamp)\] \[(level)\] (message)( \(service=(name)\))?` is parsed, validated, and inserted in batches of 1000
- **AND** an optional trailing `(service=name)` suffix is captured into the `service` column
- **AND** lines that do not match the pattern are counted as skipped (not inserted, not failing the request)
- **AND** the service returns 201 with `{ message, imported: number, skipped: number, duplicates: number }`

#### Scenario: Missing file
- **WHEN** a client POSTs to `/api/logs/upload` without a file
- **THEN** the service returns 400 with an error message

#### Scenario: Level normalization on upload
- **WHEN** an uploaded line carries a level not in the `LogLevel` enum (e.g. `TRACE`)
- **THEN** that level is normalized to `INFO` and the line is still imported (counted in `imported`, not `skipped`)

#### Scenario: Idempotency (enabled)
- **WHEN** a client POSTs a file to `/api/logs/upload`
- **THEN** the service streams a SHA-256 `upload_id` from the file bytes and stamps every parsed row with it
- **AND** before inserting, the service checks whether any row with that `upload_id` already exists; if so, the whole file is counted under `duplicates` and nothing is inserted again
- **AND** a per-`upload_id` in-memory lock serializes concurrent uploads of the same file, preventing a TOCTOU race where two simultaneous identical uploads could both pass the existence check and double-insert
- **AND** re-uploading the same file returns `imported` `0`, `duplicates` equal to the file's row count, and a `message` indicating the file was already imported
- **AND** rows without `upload_id` (from `/api/logs/push` or legacy seed) never collide because the `upload_id` index is non-unique and NULLs are distinct
- **AND** the service returns 201 with `{ message, imported, skipped, duplicates }`

### Requirement: List and filter logs
The system SHALL return paginated logs with optional level, text search, and date-range filters.

If both `level` and `levels` are provided, `levels` takes precedence and `level` is ignored.

#### Scenario: Filtered, paginated query
- **WHEN** a client GETs `/api/logs` with `page`, `perPage`, `level`, `search`, `startDate`, `endDate`
- **THEN** the service returns `data` and `meta` (totalItems, totalPages, currentPage, perPage, hasNextPage, hasPreviousPage) ordered by timestamp desc

#### Scenario: Invalid query params
- **WHEN** a client sends invalid query params (e.g. perPage > 100)
- **THEN** the global error handler returns 400 with Zod field errors

### Requirement: Aggregate dashboard metrics
The system SHALL expose total count, level distribution, and daily volume trend.

#### Scenario: Metrics request
- **WHEN** a client GETs `/api/metrics` with optional `startDate`/`endDate`
- **THEN** the service returns `summary.total`, `distribution` by level, and `trends` (date + count, last 30 days by default)

#### Scenario: Distribution always returns all levels
- **WHEN** the metrics endpoint computes `distribution`
- **THEN** it returns exactly the five `LogLevel` values (`INFO`, `WARN`, `ERROR`, `DEBUG`, `FATAL`), with `count: 0` for levels absent in the window (never a partial set)

#### Scenario: Per-level trend shape
- **WHEN** the metrics endpoint computes `trendsByLevel`
- **THEN** it returns one object per day in the window, each with `date` and the five level keys (`INFO`, `WARN`, `ERROR`, `DEBUG`, `FATAL`) as count fields, sorted ascending by `date`

#### Scenario: Date filters are full ISO datetimes
- **WHEN** `startDate`/`endDate` are supplied to `/api/metrics`
- **THEN** they must be ISO-8601 datetimes (validated via `z.string().datetime()`); the frontend sends full ISO strings (date-only inputs are expanded to inclusive `T00:00:00` / `T23:59:59.999Z`)

### Requirement: Persist logs with indexed schema
The system SHALL store logs using the Prisma `Log` model and `LogLevel` enum with indexes on timestamp, level, and service.

#### Scenario: Schema definition
- **WHEN** the Prisma schema is applied
- **THEN** a `Log` table exists with `id`, `timestamp`, `level`, `message`, `service?`, `createdAt` and indexes on `[timestamp]`, `[level]`, and `[service]`

### Requirement: Health and readiness probe
The system SHALL expose `GET /api/health` returning service liveness and database connectivity.

#### Scenario: Healthy
- **WHEN** a client GETs `/api/health` and the database is reachable
- **THEN** the service responds 200 with `{ status: "ok", db: "up", timestamp }`

#### Scenario: Database down
- **WHEN** a client GETs `/api/health` and the database ping (`SELECT 1`) fails
- **THEN** the service responds 503 with `{ status: "ok", db: "down", timestamp }`

#### Scenario: Render health check
- **WHEN** Render performs its health check
- **THEN** it targets `/api/health` (set via `healthCheckPath` in render.yaml)

### Requirement: Documented API contracts (OpenAPI/Swagger)
The system SHALL expose its HTTP contracts via `@fastify/swagger` + `@fastify/swagger-ui` at `/docs` (UI) and `/docs/json` (OpenAPI document). Response shapes SHALL be described by the route `schema` `response` definitions (and match the JSON the handlers return and the unit/integration tests assert).

Request parameters are validated by each route's **Zod** schema (not by a Fastify `querystring` schema). Rationale: a Fastify `querystring` schema makes Fastify validate/serialize the query, and that behavior varies across the Fastify/ajv versions resolved by a floating `npm install`, which broke the `level` filter in CI. Keeping validation in Zod (the pre-Swagger behavior) is version-independent. The request parameters are still documented in this spec and in `README.md`; the OpenAPI document shows endpoints + response bodies.

#### Scenario: GET /api/logs contract
- **WHEN** a client inspects the OpenAPI document for `GET /api/logs`
- **THEN** the `200` response schema documents `{ data: object[], meta: { totalItems, totalPages, currentPage, perPage, hasNextPage, hasPreviousPage } }`
- **AND** the accepted query params (validated by Zod) are: `page` (1-based, default 1), `perPage` (1–100, default 20), `level` (enum of the five levels), `levels` (string or array; comma-separated or repeated params; takes precedence over `level`), `service` (case-insensitive substring), `search` (case-insensitive substring), `startDate` and `endDate` (ISO-8601 datetimes)

#### Scenario: GET /api/metrics contract
- **WHEN** a client inspects the OpenAPI document for `GET /api/metrics`
- **THEN** the `200` response schema documents `{ summary, distribution, trends, trendsByLevel }`
- **AND** the accepted query params (validated by Zod) are optional `startDate` and `endDate` (ISO-8601 datetimes)
- **AND** the `200` response schema documents `{ summary: { total }, distribution: { level, count }[], trends: { date, count }[], trendsByLevel: { date, level, count }[] }`

#### Scenario: POST /api/seed contract
- **WHEN** a client inspects the OpenAPI document for `POST /api/seed`
- **THEN** the `querystring` schema documents `count` (1–50000, default 1000) and `days` (1–365, default 30)
- **AND** the `201` response schema documents `{ message, imported, total }`

#### Scenario: POST /api/logs/upload contract
- **WHEN** a client inspects the OpenAPI document for `POST /api/logs/upload`
- **THEN** the route is tagged `multipart/form-data` (consumes) with a `file` field
- **AND** the `201` response schema documents `{ message, imported, skipped, duplicates }`

#### Scenario: POST /api/logs/push contract
- **WHEN** a client inspects the OpenAPI document for `POST /api/logs/push`
- **THEN** the route is tagged `text/plain` and `application/json` (consumes)
- **AND** the `201` response schema documents `{ imported, skipped }`

#### Scenario: GET /api/health contract
- **WHEN** a client inspects the OpenAPI document for `GET /api/health`
- **THEN** the `200` response schema documents `{ status, db, timestamp }`

### Requirement: OpenTelemetry tracing (backend)
The system SHALL initialize OpenTelemetry at startup, auto-instrumenting HTTP and Fastify requests, with a resource named `fullstack-log-tower-api`.

#### Scenario: Exporter selection
- **WHEN** `OTEL_EXPORTER_OTLP_ENDPOINT` is set
- **THEN** spans are exported via OTLP/HTTP to that endpoint
- **AND** when it is unset, spans are exported to stdout/console (no external service required)

#### Scenario: Request correlation
- **WHEN** any request is handled
- **THEN** a trace/span is created and the response includes an `X-Request-Id` header
- **AND** the structured request log records method, route, status code, duration, and trace id

### Requirement: Structured request logging
The system SHALL log each response via an `onResponse` hook with method, route, status code, duration (ms), and request/trace id at info level, and set the `X-Request-Id` response header.

### Requirement: Shared log-line parser
The system SHALL expose a shared `parseLogLine(line)` parser (and `mapLogLevel`) from `src/lib/parse.ts` used by both the upload and tail/push ingest paths, returning `{ timestamp, level, message, service? } | null`.

#### Scenario: Shared parser
- **WHEN** a line matches `\[(timestamp)\] \[(level)\] (message)( \(service=(name)\))?`
- **THEN** `parseLogLine` returns the parsed fields; an invalid line or timestamp returns `null`
- **AND** `mapLogLevel` upper-cases valid levels and normalizes unknown levels to `INFO`

### Requirement: HTTP push ingest
The system SHALL accept log lines pushed over HTTP so a running app can stream its logs without writing a file via `POST /api/logs/push`.

#### Scenario: Push plain text lines
- **WHEN** a client POSTs newline-delimited log lines (`text/plain`) to `POST /api/logs/push`
- **THEN** they are parsed and inserted (valid lines counted in `imported`, unparseable lines in `skipped`), returning 201 `{ imported, skipped }`

#### Scenario: Push JSON array
- **WHEN** a client POSTs a JSON array of `{ timestamp, level, message, service? }` (`application/json`) to `POST /api/logs/push`
- **THEN** they are validated (Zod) and inserted, with unknown levels normalized to `INFO`, returning 201 `{ imported, skipped }`

#### Scenario: Invalid body
- **WHEN** the body is empty or fails validation
- **THEN** the service returns 400 with an error message

### Requirement: File-tail ingest
The system SHALL tail one or more log files and ingest new lines live, reusing the shared parser, with no new runtime dependencies (Node `fs`/`readline` only).

#### Scenario: Tail a running app's log file
- **WHEN** the CLI is started with `--tail <file>`
- **THEN** new lines appended after start are parsed and inserted as `Log` rows
- **AND** truncation/rotation (file size < stored offset) resets the byte offset and re-reads from 0
- **AND** only bytes written after start are ingested (seeks to EOF at boot)

### Requirement: Installable log-observer package
The system SHALL be publishable and installable as a local dev dependency (`log-tower`) so a host app can run it to observe its logs.

#### Scenario: Packaging metadata
- **WHEN** the package is built (`tsc -p tsconfig.json` with declarations)
- **THEN** it exposes `name: "log-tower"`, `bin.log-tower` → `dist/cli.js`, `main`/`types`/`exports` → `dist`, and ships only `dist` via `files` (not `private: true`)

#### Scenario: Factory + CLI
- **WHEN** `createLogTower(opts)` is called
- **THEN** it returns a Fastify instance with all routes registered (upload, getLogs, metrics, seed, health, push), a `prisma` decorator, CORS, multipart, request logging, and static UI serving when `frontend/dist` exists (no `@fastify/static` dependency)
- **AND** `startLogTower(app, port?)` runs `prisma migrate deploy` (non-fatal) and listens on `0.0.0.0:<port>` (default 3333)

#### Scenario: CLI run
- **WHEN** the CLI is invoked as `npx log-tower --tail <file> --port 3333 --db <url>`
- **THEN** it builds the app, tails the given file(s), serves the UI, and prints `LogTower UI: http://localhost:<port>/`

### Requirement: Live observation in existing UI
The system SHALL show ingested (tail/push/upload) logs in the existing Dashboard and Logs views.

#### Scenario: UI reflects ingested logs
- **WHEN** logs arrive via tail or push
- **THEN** they appear in the Logs table and Dashboard metrics after the page's normal poll/refresh (same `Log` table + `GET /api/logs`)
