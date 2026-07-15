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
