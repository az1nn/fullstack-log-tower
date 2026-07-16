# Changelog

## 0.2.0 (2026-07-16)

Release bundling the frontend dashboard into the `log-tower` npm package so the
CLI serves the real UI out of the box.

### Backend (`log-tower` 0.1.0 → 0.2.0)
- `POST /api/logs/push` — HTTP push ingest (text/plain lines or JSON array).
- File-tail ingest (`--tail <files>`); Node `fs`/`readline`, byte-offset tracking, rotation handling.
- `createLogTower(opts)` factory + `startLogTower(app, port)`; prisma injectable via `app.decorate('prisma')`.
- CLI `log-tower` (`--tail`, `--port`, `--db`, `--ui`); serves the bundled UI from `dist/ui`.
- Installable packaging: `bin`, `main`/`types`/`exports`, `files`, declaration build, explicit `.js` ESM imports.

### Frontend (`log-analyzer-frontend` 1.0.0 → 1.1.0)
- Bundled into `log-tower` package (`dist/ui`) and served by the CLI.
- Mock-log generator modal (Generate & import / Download only).
- Single consolidated upload status banner.

## 0.1.0 (2026-07-16)

Initial `log-tower` package from the fullstack log-analysis app:
upload ingest, paginated logs, dashboard metrics, health probe, OpenTelemetry.
