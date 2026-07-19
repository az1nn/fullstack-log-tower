# Agent Workflow: OpenSpec SDD Loop

> This project uses the **OpenSpec Specification-Driven Development (SDD)** loop as its default development harness. Every change goes through three phases: **Propose** (define specs and tasks in `openspec/changes/`), **Apply** (implement exactly what is specified in `tasks.md`), and **Archive** (record and move completed specs to `openspec/specs/` + `openspec/changes/archive/`).

**ALWAYS commit and push after completing changes.** Do not wait to be asked.

## Project Overview

**Fullstack Log Tower** — a log analysis platform.

- **Backend:** Node.js + TypeScript + Fastify, PostgreSQL via Prisma, Zod validation, stream-based log ingestion. Runs on port `3333`.
- **Frontend:** React + TypeScript (Vite) + Tailwind CSS, `react-router-dom`, axios (`http://localhost:3333/api`), `recharts`, `lucide-react`, `date-fns`. Runs on port `5173`.
- **Infra:** PostgreSQL 15 via `docker-compose.yml`. Prisma schema in `prisma/schema.prisma`. Connection via `DATABASE_URL` in `.env` (see `.env.example`).

## Repository Layout

```
src/                         # Backend (Fastify)
  server.ts                  # App entry, CORS, multipart, error handler, route registration
  lib/prisma.ts              # Prisma singleton
  routes/
    upload.ts                # POST /api/logs/upload (stream + batch insert)
    get-logs.ts              # GET /api/logs (paginated + filters)
    metrics.ts              # GET /api/metrics (totals, distribution, trends, trendsByLevel)
    seed.ts                  # POST /api/seed (generate mock logs via API)
  scripts/
    seed.ts                  # Mock log generator + DB seeder
    generate-mock-file.ts    # Writes a mock .log file for upload tests
prisma/schema.prisma         # Log model, LogLevel enum, indexes
frontend/
  src/
    main.tsx, App.tsx        # Bootstrap + router
    layouts/AppLayout.tsx    # Sidebar + header shell
    lib/axios.ts             # Axios client (baseURL http://localhost:3333/api)
    lib/export.ts            # CSV/JSON download helpers
    pages/
      Dashboard.tsx          # Metrics charts + date-range/refresh controls
      Logs.tsx               # Paginated table + filters + detail + export
      Upload.tsx             # Drag-drop upload + progress + validation
openspec/
  specs/                     # Main specs (backend, frontend, infra) — source of truth
  changes/                   # Active change proposals (proposal/design/tasks + delta specs)
  changes/archive/           # Archived completed changes
docker-compose.yml           # PostgreSQL 15
frontend/vercel.json        # SPA rewrite so client routes don't 404 on Vercel
.github/workflows/ci.yml    # CI: backend (mocked + real Postgres) + frontend
```

## Pre-flight

Before starting any task:

- [ ] Read this file (`AGENTS.md`) fully
- [ ] Review `openspec/specs/` for the relevant domain (backend/frontend/infra)
- [ ] Check git log (`git log --oneline -10`) for recent context
- [ ] Check `package.json` (root) and `frontend/package.json` before adding any dependency — **do not add new deps without approval**
- [ ] For backend work: ensure Prisma client is generated (`npx prisma generate`); the DB is optional for typechecks but required for runtime
- [ ] For frontend work: confirm available libraries are `axios`, `date-fns`, `lucide-react`, `react-router-dom`, `recharts` (no others)

## Phase 1: Plan (Spec)

**Goal:** Define what changes before writing code.

1. Create `openspec/changes/<change-name>/` with:
   - `proposal.md` — why + what changes + impact
   - `design.md` — approach, key decisions, risks
   - `tasks.md` — step-by-step checklist (`- [ ]` items)
   - `specs/<domain>/spec.md` — delta spec using `## ADDED/MODIFIED Requirements` with `#### Scenario:` blocks (backend/frontend/infra as relevant)
2. Keep changes minimal and scoped to the spec.
3. **Commit & push the spec files before any implementation** (see Commit section).

Do NOT skip straight to code. Wait for user approval of the spec before implementing source edits.

## Phase 2: Act (Implement)

**Goal:** Implement per `tasks.md` with minimal scope.

### Constraints

- **No new dependencies** unless explicitly approved. Check both `package.json` files first.
- **Follow existing patterns.** Backend: `any` for Prisma `whereClause`, Zod coerced schemas, `$queryRaw` tagged templates with `bigint` casts → `Number()`. Frontend: Tailwind utility classes, `lucide-react` icons, axios from `../lib/axios`.
- **No comments in code** unless asked.
- **Don't modify config files** (`tsconfig.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `docker-compose.yml`) unless the task requires it.
- **No dead code.** Remove unused imports/variables.
- **Root cause, not suppression.** Fix underlying issues; don't swallow errors with empty catch blocks.
- **Spec files are source of truth** — code must match the delta specs in the active change.

### API Contracts (current)

- `POST /api/logs/upload` — multipart `file` field; 201 `{ message, imported, skipped, duplicates }`; 400 `{ error }`. Idempotency via `upload_id` (SHA-256 of the file buffer) is enabled — re-uploading an identical file reports `duplicates > 0` / `imported: 0` and does not insert again.
- `POST /api/logs/push` — ingest pushed logs without multipart. `Content-Type: text/plain`: body is newline-delimited log lines parsed with the shared parser (201 `{ imported, skipped }`). `Content-Type: application/json`: body is an array of `{ timestamp, level, message, service? }` validated with Zod; unknown levels normalize to INFO (201 `{ imported, skipped }`). Empty/invalid body → 400.
- `GET /api/logs` — query `page`, `perPage` (1–100), `level`, `levels[]`, `service`, `search`, `startDate`, `endDate` (ISO). Response `{ data, meta }`.
- `GET /api/metrics` — query `startDate?`, `endDate?`. Response `{ summary, distribution, trends, trendsByLevel }`.
- `POST /api/seed` — query `count`, `days`. Response `{ message, imported, total }`.

## Phase 3: Check (Verify)

Run in this order; all must pass:

```
# 1. Code Review — delegate to the code-review subagent (Task tool, subagent_type="code-review")
# 2. Backend typecheck
cd /home/az1nn/fullstack-log-tower && npx tsc --noEmit
# 3. Frontend typecheck
cd /home/az1nn/fullstack-log-tower/frontend && npx tsc --noEmit
# 4. Backend unit tests (mocked Prisma — no DB needed)
cd /home/az1nn/fullstack-log-tower && npx vitest run
# 5. Frontend tests
cd /home/az1nn/fullstack-log-tower/frontend && npx vitest run
```

If a check fails: read the error, fix the root cause, re-run from the top. Only proceed when all pass.

### Integration tests (real Postgres)

Backend `src/routes/integration.test.ts` exercises the real API against Postgres. It
needs a running DB with `DATABASE_URL` pointing at it:

```
docker compose -f docker-compose.test.yml up -d db-test   # Postgres on :5433, db logsdb_test
npx prisma migrate deploy
DATABASE_URL="postgresql://admin:adminpassword@localhost:5433/logsdb_test?schema=public" \
  npx vitest run src/**/integration.test.ts
```

In CI (`.github/workflows/ci.yml`) this runs automatically on every push/PR.
Default `npm test` (mocked) always passes without Docker; integration runs only
where Postgres is available.

## Build & Deploy (Docker / Render / Vercel)

### Local Docker
Helper scripts:
- `scripts/install-docker.sh` — installs Docker Engine on Ubuntu/Debian.
- `scripts/build-and-run.sh` — `docker compose up -d` (Postgres) + `docker build` + run backend on `:3333`.
  Reads `DATABASE_URL` from `.env` (falls back to `.env.example`) and rewrites
  `localhost` → `host.docker.internal` so the container reaches the host Postgres
  (Linux adds `--add-host=host.docker.internal:host-gateway`). No credentials hardcoded.

The backend `Dockerfile` uses `node:20-slim` and installs `libssl1.1` because
**Prisma 5.22's query engine needs `libssl.so.1.1`** (Debian 12 ships OpenSSL 3 only).
Migrations run at startup via `prisma migrate deploy` in `src/server.ts` (the free
Render tier has no `preDeployCommand`).

### Render (backend)
- `render.yaml` defines a `web` service (`runtime: docker`, free) + a `databases:` Postgres 15 (free).
  `DATABASE_URL` is injected from the DB; set `CORS_ORIGINS` to the Vercel URL on creation.
- Free tier notes: no `preDeployCommand` (migrations run at startup), web service sleeps after
  15 min idle, free Postgres expires after 30 days.

### Vercel (frontend)
- `frontend/vercel.json` sets `framework: vite`, `outputDirectory: dist`, SPA rewrite.
- Set env var `VITE_API_URL` = `https://<render-service>.onrender.com/api` (build-time).
- `frontend/src/lib/axios.ts` reads `VITE_API_URL`, falls back to `http://localhost:3333/api`.

## Phase 4: Repeat / Commit

- **More tasks:** return to Phase 1.
- **Complete:** commit and push.

### Commit conventions

```
type: short description (max 72 chars)

- bullet list of specific changes
- reference change name / spec updated
```

Types: `fix`, `feat`, `chore`, `refactor`, `docs`.

Keep spec commits separate from implementation commits (Phase 1 then Phase 2). Always `git push` after committing.

## Subagent-First Rule (Context Preservation)

The main agent is the **architect/orchestrator** and preserves its own context window. **ALWAYS delegate** to subagents — never do heavy work inline:

- **Explore/read:** delegate codebase reading and searches to a `general`/`explore` subagent; return only concise summaries.
- **Implement:** delegate source edits to a `general` subagent with a detailed task description (include spec paths + files to modify + conventions).
- **Verify:** delegate `tsc` runs to a subagent; return only pass/fail + relevant errors.
- **Code review:** run the `code-review` subagent before every commit.
- **Commit & push:** delegate git staging/commit/push to a subagent.

The main agent only plans, decides, dispatches (parallel when independent), and integrates concise summaries. Keep raw file contents, logs, and diffs inside subagents.

## Running the Stack (Docker)

To bring up the full stack (db + backend + frontend) for testing/verification:

```bash
bash scripts/setup.sh          # install native Docker (if missing) + docker compose up --build
# or, if Docker is already installed:
docker compose up --build
```

- Frontend: http://localhost:8080  (proxies `/api/*` → backend)
- Backend API: http://localhost:3333/api
- Backend runs `prisma migrate deploy` on startup.

Seed real data for UI checks:
```bash
curl -X POST "http://localhost:3333/api/seed?count=500&days=7"
# push formatted logs (format: [timestamp] [LEVEL] message (service=name))
curl -X POST "http://localhost:3333/api/logs/push" -H "Content-Type: text/plain" \
  --data-binary $'[2026-07-18T10:01:12Z] [ERROR] boo (service=api)'
```

Logs live in `screenshots/` (dashboard/logs/upload PNGs) generated against real data.

## Session Recovery (Abort Flow)

When a session goes bad, return to a clean known-good state:

```
git status
git stash                 # keep any wanted work
git checkout master
git pull --ff-only origin master
git reset --hard HEAD     # discard local changes (after reviewing with git diff)
git clean -fd             # remove untracked files
```

Never abort a merge/cherry-pick without reviewing `git diff --cached` first.
