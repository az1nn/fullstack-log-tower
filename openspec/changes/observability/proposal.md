# Proposal: Observability & Structured Logging

## Why
The backend currently logs only via `fastify({ logger: true })` with a bare
`app.log.error()` in the error handler. There is no request lifecycle logging,
no correlation ID, no health/readiness probe, and no distributed tracing. The
frontend reports errors only via `console.error`. For a deployed app (Render +
Vercel free tiers) this makes incidents hard to diagnose.

We will adopt **OpenTelemetry** (vendor-neutral, the industry standard) as the
observability backbone, plus a lightweight `/api/health` readiness probe and
structured request logging. Telemetry is exported via OTLP/HTTP to a
configurable endpoint, defaulting to a console exporter so Render captures it
in build/runtime logs with zero external infrastructure.

## What changes
- **Backend tracing**: `@fastify/otel` (official Fastify OTel plugin) + OTel SDK
  with auto-instrumentation for HTTP. Spans carry `service.name`, trace/span IDs.
- **Structured request logging**: an `onResponse` hook logs method, route,
  status, duration, and the active trace/request ID; the ID is echoed in the
  `X-Request-Id` response header.
- **Health/readiness**: `GET /api/health` returns liveness + a `prisma.$queryRaw`
  DB ping; used by Render health check (currently `/api/metrics`).
- **Frontend tracing**: `@opentelemetry/sdk-trace-web` + OTLP/HTTP exporter
  sending traces to the same collector; axios interceptor propagates
  `traceparent` and forwards `X-Request-Id`. Frontend errors still surface via
  the existing error UI; severe errors are reported as spans/events.
- **Config**: `OTEL_EXPORTER_OTLP_ENDPOINT` (optional) selects an OTLP backend
  (e.g. Grafana Cloud free tier); when unset, a console exporter is used so no
  external service is required on free tiers.

## Tradeoffs / limitations
- Prisma 5.22 does **not** support Prisma-native OTel tracing (requires Prisma
  6.1+ / `@prisma/instrumentation`). DB calls will not be auto-spanned; the
  `/api/health` DB ping plus Fastify/HTTP spans provide sufficient signal.
  Upgrading Prisma is out of scope.
- OTLP to an external backend needs a free collector (Grafana Cloud free, etc.);
  default console export keeps it zero-infra.
- New dependencies are required (OTel SDK + `@fastify/otel`); this is the
  user-approved direction (OpenTelemetry over Sentry).

## Impact
- New backend deps: `@fastify/otel`, `@opentelemetry/api`,
  `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`,
  `@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/resources`,
  `@opentelemetry/semantic-conventions`.
- New frontend deps: `@opentelemetry/api`, `@opentelemetry/sdk-trace-web`,
  `@opentelemetry/exporter-trace-otlp-http`,
  `@opentelemetry/context-zone`.
- No DB schema changes. No API contract changes except the new `/api/health`.
