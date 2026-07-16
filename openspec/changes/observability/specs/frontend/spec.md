## ADDED Requirements

### Requirement: Frontend OpenTelemetry tracing
The system SHALL initialize OpenTelemetry in the browser, exporting traces via
OTLP/HTTP when `VITE_OTEL_EXPORTER_OTLP_ENDPOINT` is configured; when unset,
tracing is a no-op so no external service is required.

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
- **THEN** it propagates the W3C `traceparent` and forwards the backend's
  `X-Request-Id` response header for log correlation
- **AND** on a request error it records an exception span for trace backends
