# Design: Observability & Structured Logging

## Backend

### OpenTelemetry bootstrap (`src/lib/otel.ts`)
- Build a `NodeSDK` with `getNodeAutoInstrumentations()` (HTTP + Fastify via the
  `@fastify/otel` plugin, not the deprecated instrumentation package).
- Resource: `service.name = "fullstack-log-tower-api"`,
  `service.version` from env, `deployment.environment` from `NODE_ENV`.
- Exporter selection:
  - If `OTEL_EXPORTER_OTLP_ENDPOINT` is set → `OTLPTraceExporter` (HTTP) to that
    endpoint.
  - Else → a console/STDOUT span exporter (zero infra).
- `sdk.start()` once at boot (in `src/server.ts` before `app.listen`).

### Fastify OTel plugin
- `@fastify/otel` v0.20+ is an `Instrumentation` (not a plugin-class). It is
  added to the NodeSDK `instrumentations` array with
  `{ registerOnInitialization: true }` in `src/lib/otel.ts`, so it auto-wraps
  Fastify route handlers and lifecycle hooks. No separate `app.register()` of
  the instrumentation is needed.
- The instrumentation exposes the active span via the OTel request context for
  structured logging.

### Structured request logging (`src/lib/request-logger.ts`)
- `app.addHook('onResponse', async (req, reply) => { ... })`:
  - compute `durationMs = reply.getResponseTime()`.
  - log `{ reqId, method, url: req.routeOptions.url, statusCode, durationMs,
    traceId }` at info level (pino child of `app.log`).
  - set `reply.header('X-Request-Id', req.id)` (Fastify already generates
    `req.id`; OTel propagates traceId separately).
- Keep the existing Zod error handler; attach `req.id` / traceId to error logs.

### Health (`src/routes/health.ts`)
- `GET /api/health`: returns `{ status: 'ok', db: 'up'|'down', timestamp }`.
- DB ping: `await prisma.$queryRaw\`SELECT 1\`` wrapped in try/catch; on failure
  `db: 'down'` and HTTP 503. Always 200 for pure liveness when DB is up.
- Register in `src/server.ts`.
- Update `render.yaml` `healthCheckPath` to `/api/health` (more accurate than
  `/api/metrics`).

## Frontend

### OTel web (`frontend/src/lib/otel.ts`)
- `WebTracerProvider` with `OTLPTraceExporter` (HTTP). Endpoint from
  `import.meta.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT`; if unset, exporter is
  omitted (no-op tracing) to avoid errors on free tier.
- `ZoneContextManager` + `documentLoad` instrumentation.
- `provider.register()` once at startup (`main.tsx`).

### Axios propagation (`frontend/src/lib/axios.ts`)
- Response interceptor: forward `X-Request-Id` from the backend response into a
  stored value; on error, capture the request id for correlation.
- Propagate W3C `traceparent` via OTel context on outgoing requests.

### Error surfacing
- Keep the existing friendly error banners (upload/metrics/logs).
- Severe/unexpected errors: `Sentry` not used (OTel chosen) — instead record an
  exception span via the web tracer so it appears in the trace backend. Existing
  `console.error` stays as a fallback.

## Config / env
- Backend: `OTEL_EXPORTER_OTLP_ENDPOINT` (optional), `NODE_ENV`.
- Frontend: `VITE_OTEL_EXPORTER_OTLP_ENDPOINT` (optional, build-time).
- `frontend/.env.example` updated with the VITE var.

## Verification
- Backend `tsc --noEmit` + `vitest run` (add a health route test; OTel bootstrap
  is guarded so tests don't require a collector).
- Frontend `tsc --noEmit` + `vitest run`.
- Local: `tsx src/server.ts` prints spans to stdout; `/api/health` returns ok.
