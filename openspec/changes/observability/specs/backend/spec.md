## ADDED Requirements

### Requirement: Health and readiness probe
The system SHALL expose `GET /api/health` returning the service liveness and
database connectivity.

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
The system SHALL initialize OpenTelemetry at startup, auto-instrumenting HTTP
and Fastify requests, with a resource named `fullstack-log-tower-api`.

#### Scenario: Exporter selection
- **WHEN** `OTEL_EXPORTER_OTLP_ENDPOINT` is set
- **THEN** spans are exported via OTLP/HTTP to that endpoint
- **AND** when it is unset, spans are exported to stdout/console (no external service required)

#### Scenario: Request correlation
- **WHEN** any request is handled
- **THEN** a trace/span is created and the response includes an `X-Request-Id` header
- **AND** the structured request log records method, route, status code, duration, and trace id

## MODIFIED Requirements

### Requirement: Persist logs with indexed schema
- The OpenTelemetry initialization MUST NOT introduce a database dependency at
  import time (tracing starts after Prisma is ready) so that the startup
  `prisma migrate deploy` and cold starts remain reliable.
