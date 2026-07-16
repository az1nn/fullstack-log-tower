## Purpose
Provide local development infrastructure: a PostgreSQL database via Docker Compose and Prisma as the migration source of truth.

## Requirements

### Requirement: Run PostgreSQL locally
The system SHALL start a PostgreSQL 15 container with persistent storage for local development.

#### Scenario: Compose up
- **WHEN** `docker compose up -d` is run
- **THEN** a `log-analyzer-db` container starts on port 5432 with user `admin`, password `adminpassword`, database `logsdb`, and a persistent `pgdata` volume

### Requirement: Prisma schema as source of truth
The system SHALL define the database model in `prisma/schema.prisma` and consume `DATABASE_URL` from environment.

#### Scenario: Migration
- **WHEN** `prisma migrate dev` runs against the configured `DATABASE_URL`
- **THEN** the `Log` table and `LogLevel` enum are created per the schema
- **AND** migrations are applied in production via `prisma migrate deploy` at server startup (the free Render tier has no `preDeployCommand`)
- **AND** a second migration (`1_upload_id`) previously added a nullable `upload_id` column and a unique index `Log_upload_id_key` for per-file idempotent uploads; this was **dropped** in migration `2_drop_upload_id` because idempotency was disabled (see backend spec "Idempotency" rationale). The original `0_init` migration remains.

### Requirement: Provide connection config
The system SHALL expose `DATABASE_URL` so Prisma and the backend connect to the local database.

#### Scenario: Env provided
- **WHEN** the project is loaded
- **THEN** `DATABASE_URL` points to `postgresql://admin:adminpassword@localhost:5432/logsdb?schema=public`

### Requirement: Deploy backend on Render
The system SHALL be deployable to Render via `render.yaml` using a Docker image built from `Dockerfile`, with a managed PostgreSQL add-on and automatic migrations.

#### Scenario: Render deploy
- **WHEN** a Render deploy is triggered from `render.yaml`
- **THEN** a `fullstack-log-tower-api` web service (free plan, port 3333, `runtime: docker`) and a `logtower-db` PostgreSQL 15 add-on are created
- **AND** `DATABASE_URL` is injected from the database connection string
- **AND** `releaseCommand: npx prisma migrate deploy` applies migrations on each deploy
- **AND** the server binds to `process.env.PORT` (default 3333) on host `0.0.0.0`

#### Scenario: CORS allowlist in production
- **WHEN** the backend runs in production
- **THEN** `CORS_ORIGINS` is set to the deployed frontend origin(s), comma-separated, and CORS is restricted to that allowlist

#### Scenario: Health check path
- **WHEN** Render performs its health check
- **THEN** it targets `/api/health` (replacing `/api/metrics`) so liveness and database connectivity are both verified

### Requirement: Observability configuration
The system SHALL support OpenTelemetry via optional environment variables:
- Backend: `OTEL_EXPORTER_OTLP_ENDPOINT` (OTLP/HTTP trace backend; unset → console exporter).
- Frontend: `VITE_OTEL_EXPORTER_OTLP_ENDPOINT` (build-time; unset → no-op).

#### Scenario: No collector configured
- **WHEN** neither OTLP endpoint is set
- **THEN** the app runs with console/stdout telemetry and no external dependency

#### Scenario: Collector configured
- **WHEN** an OTLP endpoint is provided
- **THEN** traces are sent to that backend (e.g. a free Grafana Cloud instance)

### Requirement: Deploy frontend on Vercel
The system SHALL deploy the React frontend to Vercel, pointing its API client at the deployed backend URL via the `VITE_API_URL` build-time environment variable.

#### Scenario: Vercel build
- **WHEN** Vercel builds the `frontend` directory
- **THEN** `VITE_API_URL` (e.g. `https://fullstack-log-tower-api.onrender.com/api`) is injected at build time
- **AND** the axios client uses that base URL; when `VITE_API_URL` is absent it falls back to `http://localhost:3333/api` for local development

#### Scenario: Frontend talks to backend
- **WHEN** the deployed frontend makes API calls
- **THEN** requests go to `VITE_API_URL` and the backend's `CORS_ORIGINS` includes the Vercel origin

