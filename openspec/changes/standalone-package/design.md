# Design: `log-tower` dev log-observer CLI

## Packaging (`package.json`)
- `private: false`, set `name: "log-tower"`, `version`, `"type": "module"`.
- `"bin": { "log-tower": "dist/cli.js" }`.
- `"main": "dist/index.js"`, `"types": "dist/index.d.ts"`,
  `"exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" }, "./cli": "./dist/cli.js" }`.
- `"files": ["dist"]`.
- `build`: `tsc -p tsconfig.json` with `declaration: true` added to tsconfig
  (currently emits JS only). Frontend builds separately (`frontend/` → `dist`)
  and is served as static assets by the CLI.
- Keep `dev`/`start` scripts for the current deploy.

## File-tail ingest (no new deps)
- New `src/lib/tail.ts`:
  - `tailFiles(files: string[], onLine: (line: string) => void)`: for each file,
    `fs.watchFile`/`fs.watch` + track last byte offset; on change, open a
    `readline` over the new slice (or from EOF on start) and emit each line to
    `onLine`. Re-open/re-seek on truncation/rotation.
  - Reuses the existing line parser (extract the regex + `mapLogLevel` into a
    shared `parseLogLine(line)` in `src/lib/parse.ts`, used by both upload and tail).
- Hook: lines → `prisma.log.create({ data: parsed })` (insert per line or
  batch). Validation (timestamp parse, level) identical to upload.

## HTTP push ingest
- New `src/routes/push.ts`: `POST /api/logs/push` accepting either:
  - `Content-Type: text/plain` body = newline-delimited log lines (same parser), or
  - `application/json` body = `Array<{ timestamp, level, message, service? }>`
    (validated with Zod; unknown levels → INFO).
  - Returns `{ imported, skipped }`. Reuses the parse/insert path.
- This lets a running app `fetch('http://localhost:3333/api/logs/push', { method:'POST', body: logText })` to stream its logs.

## CLI (`src/cli.ts`)
- Parse argv: `--tail <glob/files...>`, `--port <3333>`, `--db <url>`,
  `--ui` (serve built React `dist`).
- Build the Fastify app (existing routes + new `push` + tail started via
  `tailFiles` feeding the DB), `prisma migrate deploy` (non-fatal), `app.listen`.
- Serve the built frontend `dist` as static (`@fastify/static` — already a
  transitive dep via fastify ecosystem? if not present, use a tiny `fs` read
  handler; avoid new deps by serving `index.html` + assets manually or via an
  existing static plugin). Print `LogTower UI: http://localhost:<port>/`.
- If `--tail` given, start tailing immediately.

## Reuse existing app
- `src/server.ts` stays the standalone entry (Render/Docker) = CLI defaults.
- All existing routes/UI unchanged. Logs page polls `GET /api/logs`; tail/push
  write to the same `Log` table, so the UI reflects them after refresh.
  (Live SSE is a later enhancement, out of scope.)

## Host (OpenBand) usage
- `npm i -D log-tower`, add `Log`/`LogLevel` to its Prisma schema,
  `DATABASE_URL`, `prisma generate && prisma migrate deploy`.
- `package.json` script: `"logs": "log-tower --tail ./openband.log --port 3333"`.
- App streams logs via `POST /api/logs/push` or writes `./openband.log`.
- Open `http://localhost:3333/` to observe.

## Tests
- Unit: `parseLogLine` (shared), `push` route (mocked Prisma), tail offset logic
  (mock `fs`/temp file).
- Integration (real Postgres): push + tail → rows queryable via `GET /api/logs`.

## Constraints
- No new runtime dependencies (use Node `fs`/`readline`; reuse existing deps).
- Keep existing upload/metrics/get-logs/health behavior and contracts.
- Strict TS; minimal scope.
