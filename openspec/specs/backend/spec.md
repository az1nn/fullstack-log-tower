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
- **AND** the service returns 201 with `{ message, imported: number, skipped: number }`

#### Scenario: Missing file
- **WHEN** a client POSTs to `/api/logs/upload` without a file
- **THEN** the service returns 400 with an error message

#### Scenario: Level normalization on upload
- **WHEN** an uploaded line carries a level not in the `LogLevel` enum (e.g. `TRACE`)
- **THEN** that level is normalized to `INFO` and the line is still imported (counted in `imported`, not `skipped`)

#### Scenario: Idempotency (currently disabled)
- **WHEN** a client POSTs a file to `/api/logs/upload`
- **THEN** every parsed line is inserted; re-uploading the same file inserts the rows again (no dedupe)
- **RATIONALE:** idempotency (SHA-256 `upload_id` unique column + P2002 handling) was removed because it surfaced as a broken UX — re-importing generated or identical logs returned `imported: 0` / `duplicates: N` with no clear reason, making it look like logs were lost. Idempotency will be re-added later with a clearer design (e.g. an explicit "replace/upsert" option or a visible duplicate report). The `upload_id` column and its unique index were dropped in migration `2_drop_upload_id`.

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
