## Purpose
Provide the HTTP backend that ingests large log files, stores them in PostgreSQL via Prisma, and serves paginated/filtered log queries plus aggregated dashboard metrics.

## Requirements

### Requirement: Ingest log files via upload
The system SHALL accept multipart file uploads and ingest parsed log lines into the database in batches.

#### Scenario: Successful upload
- **WHEN** a client POSTs a `.txt`/`.log` file to `/api/logs/upload` with a `file` field
- **THEN** each line matching `\[(timestamp)\] \[(level)\] (message)` is parsed, validated, and inserted in batches of 1000
- **AND** the service returns 201 with a success message

#### Scenario: Missing file
- **WHEN** a client POSTs to `/api/logs/upload` without a file
- **THEN** the service returns 400 with an error message

### Requirement: List and filter logs
The system SHALL return paginated logs with optional level, text search, and date-range filters.

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

### Requirement: Persist logs with indexed schema
The system SHALL store logs using the Prisma `Log` model and `LogLevel` enum with indexes on timestamp and level.

#### Scenario: Schema definition
- **WHEN** the Prisma schema is applied
- **THEN** a `Log` table exists with `id`, `timestamp`, `level`, `message`, `service?`, `createdAt` and indexes on `[timestamp]` and `[level]`
