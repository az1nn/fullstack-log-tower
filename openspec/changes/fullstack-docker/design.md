# Design: Full-stack containerization

## Frontend image (`frontend/Dockerfile`)
Multi-stage:
1. `node:20-alpine` build stage: `npm ci`, `npm run build` (vite → `dist`).
   - No `VITE_API_URL` needed: the SPA calls relative `/api/...`; nginx proxies
     those to the backend. So the build is env-agnostic.
2. `nginx:alpine` runtime: copy `dist` → `/usr/share/nginx/html`, copy an
   `nginx.conf` that:
   - serves the SPA (try_files for SPA fallback to `index.html`),
   - proxies `location /api/ { proxy_pass http://backend:3333; ... }`.
   - listens on port 80.

## Compose (`docker-compose.yml`)
Services:
- `db`: `postgres:15`, env `POSTGRES_USER=admin`, `POSTGRES_PASSWORD=adminpassword`,
  `POSTGRES_DB=logsdb`, volume `pgdata`, healthcheck `pg_isready`.
- `backend`: `build: .` (existing Dockerfile), `ports: ["3333:3333"]`,
  `environment: DATABASE_URL=postgresql://admin:adminpassword@db:5432/logsdb?schema=public`,
  `depends_on: db (condition: service_healthy)`. Backend already runs
  `prisma migrate deploy` at startup (`src/index.ts`).
- `frontend`: `build: ./frontend`, `ports: ["8080:80"]`,
  `depends_on: backend`.
- Shared `network` (default compose network).

## Nginx config (`frontend/nginx.conf`)
- `server { listen 80; root /usr/share/nginx/html; location / { try_files $uri /index.html; } location /api/ { proxy_pass http://backend:3333; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; } }`

## Verification
- `docker compose up --build` brings up all three; browse
  `http://localhost:8080/` → SPA; API calls hit `/api/*` proxied to backend.
- Backend migrations apply at startup; upload a log file via the UI, confirm it
  appears in Logs + Dashboard.

## Notes
- Port 8080 chosen for the frontend to avoid clashing with local dev (5173) and
  backend (3333).
- No new npm dependencies. nginx handles proxying (no code change).
