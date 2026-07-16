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

