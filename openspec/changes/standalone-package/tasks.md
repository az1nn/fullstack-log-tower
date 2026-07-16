# Tasks: `log-tower` dev log-observer CLI

- [ ] **Packaging**: `private: false`; add `name: "log-tower"`, `version`, `bin`
      (`log-tower` → `dist/cli.js`), `main`/`types`/`exports` → `dist`,
      `files: ["dist"]`. Add `declaration: true` to `tsconfig.json`; `build`
      emits `dist`.
- [ ] **Shared parser**: extract the line regex + `mapLogLevel` into
      `src/lib/parse.ts` `parseLogLine(line): { timestamp, level, message, service? } | null`;
      refactor `upload.ts` to use it.
- [ ] **File-tail ingest**: `src/lib/tail.ts` `tailFiles(files, onLine)` using
      Node `fs.watch` + `readline` with byte-offset tracking and rotation
      handling; feeds parsed lines to Prisma (reuse insert path). No new deps.
- [ ] **HTTP push ingest**: `src/routes/push.ts` `POST /api/logs/push`
      accepting `text/plain` (newline lines) or `application/json`
      (`Array<{timestamp, level, message, service?}>` via Zod). Returns
      `{ imported, skipped }`.
- [ ] **CLI**: `src/cli.ts` parses `--tail`, `--port`, `--db`, `--ui`;
      builds the Fastify app (existing + push + tail), runs `prisma migrate
      deploy` (non-fatal), listens, serves built frontend `dist` statically,
      prints the URL. No new deps for static serving (reuse existing plugin
      or minimal `fs` handler).
- [ ] **Reuse existing app**: `src/server.ts` stays the standalone entry
      (CLI defaults). Existing UI (Dashboard/Logs) reflects tail/push data via
      the same `Log` table + `GET /api/logs` polling.
- [ ] **Host docs**: document OpenBand setup (Prisma `Log`/`LogLevel` schema,
      `DATABASE_URL`, `prisma generate`/`migrate deploy`, npm script
      `"logs": "log-tower --tail ./openband.log"`).
- [ ] **Tests**: `parseLogLine` unit; `push` route (mocked Prisma);
      tail offset logic (temp file, mocked `fs`); integration (real Postgres)
      push + tail → rows queryable.
- [ ] **Specs**: delta specs (backend ADDED push + tail + CLI/package;
      infra MODIFIED packaging + host setup); sync to main specs.
- [ ] Verify: backend `tsc --noEmit` + `vitest run`; frontend `tsc` + `vitest`;
      integration with Postgres. Commit spec first, then implementation.
