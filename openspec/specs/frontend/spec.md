## Purpose
Provide the React SPA that lets users view the dashboard, explore/filter logs, and upload log files through a clean sidebar layout.

## Requirements

### Requirement: Sidebar layout with navigation
The system SHALL render an `AppLayout` with sidebar links to Dashboard, Logs, and Upload.

#### Scenario: App shell
- **WHEN** any route under `/` is rendered
- **THEN** the sidebar and header wrap the active page via `<Outlet />`

### Requirement: Dashboard visualization
The system SHALL show total logs, a daily volume line chart (one line per severity), a severity distribution pie chart, date-range controls, and refresh from `GET /api/metrics`.

#### Scenario: Dashboard load
- **WHEN** the user opens `/`
- **THEN** the page fetches `/api/metrics` and renders the total card, the per-level line chart (from `trendsByLevel`), and the pie chart (from `distribution`, always 5 levels)

#### Scenario: Dashboard date-range and auto-refresh
- **WHEN** the user picks a preset (24h/7d/30d) or a custom date range, or enables auto-refresh
- **THEN** the dashboard refetches `/api/metrics` for that window; auto-refresh polls every 30s and cleans up on disable/unmount
- **AND** custom date inputs (`type="date"`) are normalized to inclusive ISO datetimes (`T00:00:00.000Z` start, `T23:59:59.999Z` end), and cleared dates are omitted from the request

### Requirement: Log explorer with search
The system SHALL list logs in a paginated table with text search, multi-level, service, and date-range filters, and a log detail expand from `GET /api/logs`.

#### Scenario: Search and paginate
- **WHEN** the user types in the search box or changes page
- **THEN** the page refetches `/api/logs` with the new `search` (resetting page to 1) or `page` value

#### Scenario: Export filtered results
- **WHEN** the user clicks "Export CSV"/"Export JSON" (current page) or "Export all (filtered)"
- **THEN** the current page or all matching rows download as a file; "Export all" is capped at 10,000 rows and the filename gains a `-truncated-10k` suffix when truncated

### Requirement: Upload screen
The system SHALL send a selected `.txt`/`.log` file via multipart/form-data to `POST /api/logs/upload`, showing drag-and-drop, client validation, progress, and clear success/error states.

#### Scenario: Successful upload
- **WHEN** the user selects a file and submits
- **THEN** the file is posted as `file` and success/error states are shown
- **AND** on success the imported count is read from the server response (`imported`); the `skipped` count (unparseable lines) is part of the 201 response

#### Scenario: Prevent double-submit
- **WHEN** an upload request is in flight (pending server response)
- **THEN** the submit control is disabled and no further upload of the same file is initiated until the request resolves
- **RATIONALE:** the backend upload endpoint is append-only and not idempotent (see backend spec); a duplicate submit or network-retry re-POST would create duplicate log rows. The client MUST guard against double-submits so the same file is not uploaded twice.

#### Scenario: Generate mock logs (no backend call)
- **WHEN** the user clicks "Generate mock logs" on the Upload screen
- **THEN** a modal opens with controls for count (1–100), days back (1–30), and an optional service name
- **AND** the generator builds lines client-side via `generateMockLogs` (no backend request to generate)

#### Scenario: Generate and import mock logs
- **WHEN** the user sets options and clicks "Generate & import"
- **THEN** the system builds `count` lines in `[timestamp] [LEVEL] message (service=name)` format and POSTs them directly to `/api/logs/upload`
- **AND** the success banner shows the imported count, or a duplicate message when the file was already imported

#### Scenario: Generate and download mock logs
- **WHEN** the user sets options and clicks "Download only"
- **THEN** the system downloads the generated lines as `mock-logs.log` via a Blob object URL; the user may import it manually through the dropzone

#### Scenario: Duplicate import message
- **WHEN** an upload (generated or dropped) is fully duplicate (imported 0, duplicates > 0)
- **THEN** the success banner shows "Arquivo já importado anteriormente (logs duplicados ignorados)."

#### Scenario: Mock log format validity
- **WHEN** the generated `mock-logs.log` is later uploaded via the dropzone
- **THEN** every line is parsed by the existing upload parser (levels from `INFO, WARN, ERROR, DEBUG, FATAL`; optional `service=` suffix)

### Requirement: Frontend OpenTelemetry tracing
The system SHALL initialize OpenTelemetry in the browser, exporting traces via OTLP/HTTP when `VITE_OTEL_EXPORTER_OTLP_ENDPOINT` is configured; when unset, tracing is a no-op so no external service is required.

#### Scenario: Configured exporter
- **WHEN** `VITE_OTEL_EXPORTER_OTLP_ENDPOINT` is set at build time
- **THEN** the web tracer exports traces to that OTLP/HTTP endpoint

#### Scenario: No exporter configured
- **WHEN** `VITE_OTEL_EXPORTER_OTLP_ENDPOINT` is unset
- **THEN** the tracer is registered but exports nothing (no runtime errors)

### Requirement: Request correlation from frontend
The system SHALL propagate trace context and surface the backend's request id.

#### Scenario: Correlation headers
- **WHEN** the frontend makes an API request
- **THEN** it propagates the W3C `traceparent` and forwards the backend's `X-Request-Id` response header for log correlation
- **AND** on a request error it records an exception span for trace backends

## Constraints
- Axios baseURL is `http://localhost:3333/api`.
- Styling via Tailwind CSS; icons via lucide-react; charts via recharts.
