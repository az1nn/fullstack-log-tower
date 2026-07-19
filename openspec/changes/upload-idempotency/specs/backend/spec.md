# Backend delta spec

## MODIFIED Requirements

### Requirement: Import log files
The system SHALL ingest newline-delimited log files via `POST /api/logs/upload`.

#### Scenario: Idempotent re-upload
- **WHEN** a client POSTs a file to `/api/logs/upload`
- **THEN** the service derives a deterministic `upload_id` (SHA-256 of the file content) and stamps every parsed row with it
- **AND** if the same file is uploaded again, the duplicate rows are counted under `duplicates` and not inserted a second time

#### Scenario: Upload response shape
- **WHEN** an upload completes (new file)
- **THEN** the service returns `201` with `{ message, imported, skipped, duplicates }` where `duplicates` is `0`
- **AND** when the same file is re-uploaded, `imported` is `0`, `duplicates` is the number of rows in the file, and `message` indicates the file was already imported

## MODIFIED Requirements

### Requirement: Idempotency (enabled)
- The `Log` model has a nullable `upload_id` column with a unique index.
- Re-uploading an identical file reports `duplicates > 0` instead of inserting again.
- `PrismaClientKnownRequestError` with code `P2002` on `upload_id` is treated as a
  duplicate and counted, not surfaced as a failure.
- Rows without `upload_id` (from `/api/logs/push` or legacy seed) never collide
  because Postgres treats NULLs as distinct.

# Frontend delta spec

## MODIFIED Requirements

### Requirement: Upload page
The Upload page SHALL let users upload a log file and see the result.

#### Scenario: Already-imported banner
- **WHEN** an upload response has `duplicates > 0` and `imported === 0`
- **THEN** the page shows an amber "already imported" banner stating the file was already uploaded, instead of a success banner
