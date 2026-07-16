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

#### Scenario: Idempotency (content hash, dedupe on re-upload)
- **WHEN** a client POSTs a file to `/api/logs/upload`
- **THEN** the service computes a SHA-256 hash of the full uploaded file content and stamps every inserted row with it as `upload_id` (a nullable, unique column on `Log`)
- **AND** if the same file is re-POSTed (or a request is retried after a network error) the unique constraint on `upload_id` causes each `createMany` to throw a Prisma P2002 error, which the route catches and skips (counting as `imported: 0` rather than failing or duplicating)
- **AND** the response is still 201 with `{ message, imported: 0, skipped }` for the duplicate upload, while different files (different hashes) insert normally
- **NOTE:** `upload_id` is nullable so the seed route and legacy rows remain valid; it is set explicitly by the upload route, never via a schema default.

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
