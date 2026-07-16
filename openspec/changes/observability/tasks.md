# Tasks: Observability & Structured Logging

- [ ] Add backend OpenTelemetry dependencies to `package.json`
      (`@fastify/otel`, `@opentelemetry/api`, `@opentelemetry/sdk-node`,
      `@opentelemetry/auto-instrumentations-node`,
      `@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/resources`,
      `@opentelemetry/semantic-conventions`).
- [ ] Create `src/lib/otel.ts`: build NodeSDK, select OTLP or console exporter
      based on `OTEL_EXPORTER_OTLP_ENDPOINT`, start once.
- [ ] Register `@fastify/otel` in `src/server.ts` and call `startTracing()`.
- [ ] Create `src/lib/request-logger.ts`: `onResponse` hook logging
      method/route/status/duration/traceId and setting `X-Request-Id`.
- [ ] Create `src/routes/health.ts`: `GET /api/health` with DB ping
      (`prisma.$queryRaw SELECT 1`); 200 ok / 503 db-down. Register in server.
- [ ] Update `render.yaml` `healthCheckPath` to `/api/health`.
- [ ] Update `src/server.ts` error handler to include `req.id`/traceId in logs.
- [ ] Add frontend OTel deps (`@opentelemetry/api`, `@opentelemetry/sdk-trace-web`,
      `@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/context-zone`).
- [ ] Create `frontend/src/lib/otel.ts`: WebTracerProvider + OTLP exporter
      (from `VITE_OTEL_EXPORTER_OTLP_ENDPOINT`, no-op if unset); register in
      `main.tsx`.
- [ ] Update `frontend/src/lib/axios.ts`: forward `X-Request-Id`, propagate
      traceparent; on error record exception span.
- [ ] Update `frontend/.env.example` with `VITE_OTEL_EXPORTER_OTLP_ENDPOINT`.
- [ ] Add backend test for `/api/health` (mocked prisma ping).
- [ ] Update specs: backend (health + observability), frontend (tracing +
      request id), infra (health check + OTel env).
- [ ] Run `npx prisma generate`, backend + frontend `tsc --noEmit`, and both
      `vitest run`; fix any failures.
- [ ] Commit & push (spec commit first, then implementation commit).
