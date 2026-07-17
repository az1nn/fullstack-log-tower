# Proposal: Full-stack containerization (frontend + backend + db)

## Why
The assessment requires **containerization (Docker)**. Today only the backend is
containerized (`Dockerfile` + `render.yaml`); the frontend is a separate Vercel
build and there is no single command to run the whole stack. This change adds a
frontend image and a root `docker-compose.yml` that brings up PostgreSQL, the
backend, and the frontend together with one command.

## What changes
- Add `frontend/Dockerfile`: multi-stage Vite build → `nginx:alpine` serving the
  SPA, proxying `/api/*` to the backend container.
- Add a root `docker-compose.yml` with three services: `db` (postgres:15),
  `backend` (build from `./Dockerfile`, port 3333), `frontend` (build from
  `./frontend/Dockerfile`, port 80). Shared network; backend `DATABASE_URL`
  uses the `db` service hostname.
- Frontend nginx config proxies `/api` → `http://backend:3333` so the browser
  only hits the frontend container (no CORS/build-time URL needed in compose).
- Keep existing `docker-compose.test.yml` and `render.yaml` untouched.
- Update `README.md` with a one-command `docker compose up --build` quick start
  (add an English section) and note the existing local-dev instructions.

## Impact
- Satisfies the "Conteinerização Docker" requirement for the whole app.
- No code changes to backend routes or React pages; only build/deploy config.
- `npm run dev` local workflow unchanged.
