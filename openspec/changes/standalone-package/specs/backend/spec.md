## ADDED Requirements

### Requirement: Installable log-observer package
The system SHALL be publishable and installable as a local dev dependency
(`log-tower`) so a host app (e.g. OpenBand) can run it to observe its logs.

#### Scenario: Install and run
- **WHEN** a host project runs `npm i -D log-tower` and `npx log-tower`
- **THEN** the package boots a Fastify server + web UI and prints a local URL to open in the browser (like `vitest --ui`)

#### Scenario: Packaging metadata
- **WHEN** the package is built
- **THEN** it exposes a `bin` (`log-tower`), `main`/`types`/`exports` to `dist`, and ships only `dist` via `files` (no `private: true`)

### Requirement: File-tail ingest
The system SHALL tail one or more log files and ingest new lines live, reusing the same line parser as the upload endpoint.

#### Scenario: Tail a running app's log file
- **WHEN** the CLI is started with `--tail ./openband.log`
- **THEN** new lines appended to that file are parsed and inserted as `Log` rows, handling file truncation/rotation
- **AND** no new runtime dependencies are introduced (Node `fs`/`readline` only)

### Requirement: HTTP push ingest
The system SHALL accept log lines pushed over HTTP so a running app can stream its logs without writing a file.

#### Scenario: Push plain text lines
- **WHEN** a client POSTs newline-delimited log lines (same format as upload) to `POST /api/logs/push` as `text/plain`
- **THEN** they are parsed and inserted, returning `{ imported, skipped }`

#### Scenario: Push JSON array
- **WHEN** a client POSTs a JSON array of `{ timestamp, level, message, service? }` objects to `POST /api/logs/push`
- **THEN** they are validated (Zod) and inserted, with unknown levels normalized to INFO, returning `{ imported, skipped }`

### Requirement: Live observation in existing UI
The system SHALL show ingested (tail/push/upload) logs in the existing Dashboard and Logs views.

#### Scenario: UI reflects ingested logs
- **WHEN** logs arrive via tail or push
- **THEN** they appear in the Logs table and Dashboard metrics after the page's normal poll/refresh (same `Log` table + `GET /api/logs`)
