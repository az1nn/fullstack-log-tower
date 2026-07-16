## MODIFIED Requirements

### Requirement: Deploy backend on Render
- Update `healthCheckPath` to `/api/health` (replacing `/api/metrics`) so the
  health check verifies both liveness and database connectivity.

### Requirement: Observability configuration
The system SHALL support OpenTelemetry via optional environment variables:
- Backend: `OTEL_EXPORTER_OTLP_ENDPOINT` (OTLP/HTTP trace backend; unset →
  console exporter).
- Frontend: `VITE_OTEL_EXPORTER_OTLP_ENDPOINT` (build-time; unset → no-op).

#### Scenario: No collector configured
- **WHEN** neither OTLP endpoint is set
- **THEN** the app runs with console/stdout telemetry and no external dependency

#### Scenario: Collector configured
- **WHEN** an OTLP endpoint is provided
- **THEN** traces are sent to that backend (e.g. a free Grafana Cloud instance)
