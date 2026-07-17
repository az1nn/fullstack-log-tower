## ADDED Requirements

### Requirement: Full-stack containerization
The system SHALL be runnable as a complete containerized stack (database, backend, frontend) with a single command.

#### Scenario: One-command stack
- **WHEN** a user runs `docker compose up --build` at the repo root
- **THEN** PostgreSQL, the Fastify backend (port 3333), and the React frontend (port 80, published as 8080) start on a shared network

#### Scenario: Frontend proxies API to backend
- **WHEN** the browser loads the frontend container and the SPA calls `/api/*`
- **THEN** nginx proxies those requests to the backend container; the browser only talks to the frontend host (no CORS/build-time URL needed in compose)

#### Scenario: Backend migrates on startup
- **WHEN** the backend container starts after the database is healthy
- **THEN** it runs `prisma migrate deploy` (already at startup) and listens on 3333
