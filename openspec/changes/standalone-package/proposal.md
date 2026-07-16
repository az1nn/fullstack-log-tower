# Proposal: `log-tower` — local dev log-observer CLI (reuse existing app)

## Why
The user wants to **install this app via npm and run it like `vitest --ui`** to
observe the logs of a *running* app (OpenBand). It must work as a **local dev
dependency** (`npm i -D log-tower` in the host project) invoked through an
npm script / `npx log-tower`, reusing the existing fullstack app (Fastify
backend + React dashboard/logs UI).

Logs come from **two sources**: (1) **tail a log file** written by the running
app, and (2) **HTTP push** — the running app POSTs its logs to the tool's
ingest endpoint. The existing UI (Dashboard + Logs table) then displays them live.

## What changes
- **Packaging**: make the backend an installable package — `private: false`,
  add `bin` (CLI `log-tower`), `main`/`types`/`exports` → `dist`, `files`,
  and a `build` that emits declarations. The frontend stays a separate Vercel
  deploy but is also buildable/distributable for the local UI.
- **File-tail ingest**: a new mode/route that tails one or more log files
  (using `fs.watch`/readline from the current EOF) and ingests new lines
  through the same parser used by `/api/logs/upload`. No new deps — use
  Node `fs` + `readline`.
- **HTTP push ingest**: a new `POST /api/logs/push` (or reuse upload via
  raw body) so a running app can stream lines/JSON without multipart. Plain
  text lines (same parser) or a JSON array of log objects.
- **CLI**: `log-tower [--tail <file>] [--port 3333] [--db <url>]` boots the
  Fastify app + serves the React UI (built `dist`); opens/prints the URL.
- **Live UX**: the existing Logs page already polls via `GET /api/logs`; the
  tail/push paths feed the same DB, so the UI updates on refresh. (Optional
  later: SSE/websocket live stream — out of scope for v1.)
- Host (OpenBand) responsibilities: own Prisma schema (`Log` + `LogLevel`),
  `DATABASE_URL`, `prisma generate` + `migrate deploy`, then run the CLI.

## Impact
- Existing deploy (Render/Docker) behavior preserved via the same entry.
- No new runtime dependencies (use Node built-ins for tailing).
- New OpenSpec change `standalone-package` (renamed intent: dev CLI, not lib).
