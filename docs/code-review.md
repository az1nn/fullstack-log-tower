# Code Review — Fullstack Log Tower

> REPORT ONLY. No source/config files were modified. This review was produced by reading all
> relevant source, specs, and change proposals, and by running the verification commands in
> AGENTS.md Phase 3 (plus targeted dynamic checks). Verification command outputs are summarized
> in the "Test/CI status" section.

Review date: 2026-07-16
Reviewer: opencode (static + dynamic analysis)
Scope: backend (`src/`), frontend (`frontend/src/`), infra/CI (compose, `.github/workflows/ci.yml`, `vercel.json`), OpenSpec specs (`openspec/specs`, `openspec/changes`).

---

## Summary

| Area | Health | Notes |
|------|--------|-------|
| Spec conformance (backend) | 🟡 Yellow | `levels` array parsing bug; minor `level`/`levels` override ambiguity |
| Spec conformance (frontend) | 🟢 Green | All delta specs implemented (filters, dashboard controls, detail/export, upload UX) |
| Correctness / bugs | 🟡 Yellow | `levels` Zod bug is the headline; distribution gaps on zero-count levels; export loop cap is correct but awkward |
| Security | 🟡 Yellow | `cors origin: true` reflects any origin; no rate limiting; `service` query unbounded (performance, not injection) |
| Type safety | 🟢 Green | `tsc --noEmit` passes on both stacks; `strict` enabled. Permitted `any` for Prisma whereClause per AGENTS.md |
| Frontend quality | 🟢 Green | Hooks deps correct, interval cleaned up, keys present, error/loading states present |
| Tests | 🟡 Yellow | Good happy-path coverage; gaps on error paths, edge cases, `service`/date filters, SECURITY/perf edges |
| CI/CD & infra | 🟡 Yellow | Integration glob `src/**/integration.test.ts` may not expand in CI shell; minor robustness gaps |
| Maintainability | 🟡 Yellow | Stray `back.md`/`front.md` docs; `seed.ts` route mixes single+batch logic; some magic numbers |
| AGENTS.md conventions | 🟢 Green | No code comments in source; patterns followed; duplicate `test` script key already fixed by user |

Overall: **Functionally complete and all automated checks are green.** The most important issues are a real
`levels` query-param parsing bug (High) and several security/robustness hardening items (Medium).

---

## Findings

### Critical

None.

### High

#### H1 — `levels` array query param fails on single value and on comma form (spec-conformance + correctness)
- **File:** `src/routes/get-logs.ts:10` (schema), `src/routes/get-logs.ts:26` (usage)
- **Description:** The schema uses `levels: z.array(z.nativeEnum(LogLevel)).optional()`. Verified dynamically against Fastify+Zod:
  - `?levels=ERROR&levels=WARN` → parses OK (this is what the frontend emits via axios array serialization, so the UI multi-select works).
  - `?levels=INFO` (single value) → **400** (`Expected array, received string`).
  - `?levels=ERROR,WARN` (comma form, common in curl/manual clients) → **400**.
  The spec scenario `log-filtering-ui` explicitly exercises `levels=ERROR&levels=WARN` (works) but the single-value and comma paths are legitimate and currently broken.
- **Why it matters:** Any client (curl, Postman, other frontends, the `service`/single-level helper) passing a single `levels` value gets a 400. It is a brittle contract and a trap for API consumers. It also silently forces everyone to use the singular `level` field instead.
- **Suggested fix:** Use a coercion that accepts string or array:
  ```ts
  levels: z.preprocess(
    (v) => (v == null ? [] : Array.isArray(v) ? v : [v]),
    z.array(z.nativeEnum(LogLevel)).optional()
  )
  ```
  Keep `level` (singular) and `levels` mutually exclusive or document precedence. Add test cases for single-value and comma inputs.

#### H2 — CORS `origin: true` reflects arbitrary origins (security)
- **File:** `src/server.ts:12`
- **Description:** `app.register(cors, { origin: true })` tells `@fastify/cors` to echo back the request `Origin` header for *any* host, effectively disabling cross-origin protection and enabling credentialed cross-site reads if cookies/auth are ever added.
- **Why it matters:** Combined with no rate limiting, an attacker page can script calls to the API from a victim's browser. For a local dev tool this is low-risk today, but it is an unsafe default to ship.
- **Suggested fix:** Restrict to known origins, e.g. `origin: ['http://localhost:5173']` (and the Vercel deploy URL via env). Prefer `origin: process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:5173']`.

### Medium

#### M1 — `distribution` / `trendsByLevel` omit zero-count levels (correctness/clarity)
- **File:** `src/routes/metrics.ts:29-43` (distribution via `groupBy`), `src/routes/metrics.ts:75-84` (`trendsByLevel` map seeded with zeros only for days present in DB)
- **Description:** `groupBy` returns only levels that occur in the window, so the pie chart never shows a level at 0 (the frontend `Cell` falls back to `COLORS.INFO` for unknown keys, but there are never unknown keys). `trendsByLevel` only seeds level keys for dates that actually appear, so a day with only INFO logs has `WARN/ERROR/... = 0` (correct), but a level with zero across the whole window is simply absent from `distribution`.
- **Why it matters:** Not a bug per se, but the response shape is inconsistent (distribution may be length 1–5) and consumers can't rely on a fixed set. The frontend pie handles it gracefully, so impact is Low-to-Medium.
- **Suggested fix:** Normalize the `distribution` to always include all five levels with count 0. Consider returning a fixed schema `{ INFO, WARN, ERROR, DEBUG, FATAL }`.

#### M2 — No rate limiting on upload/seed/metrics (security/availability)
- **File:** `src/server.ts` (whole app), `src/routes/upload.ts`, `src/routes/seed.ts`
- **Description:** There is no `@fastify/rate-limit` (not a dependency) and no request throttling. `POST /api/seed` accepts `count` up to 50000 and `POST /api/logs/upload` accepts up to 100MB, both unauthenticated and unthrottled.
- **Why it matters:** An unauthenticated client can repeatedly trigger mass inserts or 100MB uploads → DB/disk exhaustion (DoS). Within the stated "local dev" scope this is acceptable, but it should be called out before any non-local exposure.
- **Suggested fix:** Within current dependency constraints, at minimum document that the API is unauthenticated/dev-only. Longer term add `@fastify/rate-limit` (requires approving a new dependency per AGENTS.md).

#### M3 — `service` filter is unbounded text search with no index (performance)
- **File:** `src/routes/get-logs.ts:28-33` (`service` → `contains`/`insensitive`); `prisma/schema.prisma:18-28`
- **Description:** `service` uses `contains` with `mode: 'insensitive'`, which on Postgres triggers a full-table `ILIKE` scan. The schema only indexes `[timestamp]` and `[level]`, not `service` or `message`. `search` (message contains) has the same pattern.
- **Why it matters:** On large tables these filters will do sequential scans; pagination via `skip/take` still requires counting and scanning. Not an injection risk (Prisma parameterizes), but a scaling risk.
- **Suggested fix:** Add a `service` index (e.g. `@@index([service])`) and/or a trigram (`pg_trgm`) index/GIN for `message`/`service` text search if full-text is needed at scale. Note: modifying schema is fine; this is a forward-looking recommendation.

#### M4 — `metrics` `trends`/`trendsByLevel` `$queryRaw` dates are truncated to day via `DATE()` (correctness vs spec wording)
- **File:** `src/routes/metrics.ts:45-73`
- **Description:** Both queries `GROUP BY DATE("timestamp")`, returning daily buckets. The spec says "daily volume trend" (backend spec line 30, 34) and "daily counts pivoted by level" — so daily is correct. However the frontend `Dashboard` "Volume Diário de Logs" and the 24h preset pass an hourly window but still get daily buckets, so a 24h range shows at most 1–2 points.
- **Why it matters:** The 24h preset yields a near-empty line chart, a UX inconsistency rather than a defect.
- **Suggested fix:** Either bucket by hour when the window ≤ 48h, or drop/disable the 24h preset, or document that trends are always daily. Low priority.

#### M5 — Integration test command glob may not expand in CI (CI robustness)
- **File:** `.github/workflows/ci.yml:42`, `src/routes/integration.test.ts`
- **Description:** The step runs `npx vitest run src/**/integration.test.ts`. Under the default `sh` used by GitHub Actions `run:` (not bash globstar), `src/**/integration.test.ts` is passed literally to vitest. Vitest's own glob engine does expand `**`, so this *likely* works, but it is shell-fragile and inconsistent with `vitest.config.ts` (which **excludes** `integration.test.ts` from the default run).
- **Why it matters:** If glob expansion ever fails, the integration suite silently doesn't run, giving false green.
- **Suggested fix:** Use a Vitest filter that doesn't rely on shell globbing: `npx vitest run --project integration` or pass an explicit file list, or configure a separate vitest workspace. Simplest robust form: `npx vitest run src/routes/integration.test.ts`.

#### M6 — `get-logs` `level` and `levels` interaction is ambiguous (correctness/spec)
- **File:** `src/routes/get-logs.ts:24-26`
- **Description:** If both `level` and `levels` are sent, `levels` overwrites `whereClause.level` (line 26). The spec lists both as available filters but never defines precedence.
- **Why it matters:** Silent override can surprise API consumers; behavior is undocumented.
- **Suggested fix:** Choose explicit precedence (e.g. `levels` wins, or reject if both present with 400). Document it.

### Low

#### L1 — Stray documentation files `back.md` and `front.md` at repo root
- **File:** `back.md`, `front.md` (repo root)
- **Description:** These are chat-export style markdown docs (Portuguese) describing backend/frontend, separate from `openspec/` and `README.md`. They are not referenced anywhere and appear to be scratch artifacts.
- **Why it matters:** Repo clutter; possible leakage of design rationale that should live in openspec. Per AGENTS.md "NEVER proactively create documentation files" — these predate the rule but should be removed or relocated.
- **Suggested fix:** Remove or move into `docs/` (not openspec) if they carry value; otherwise delete.

#### L2 — `seed.ts` route re-implements batching already in `scripts/seed.ts`
- **File:** `src/routes/seed.ts:17-20` vs `src/scripts/seed.ts:92-96`
- **Description:** Both implement the identical `for (i+=BATCH) createMany` loop. `src/scripts/seed.ts` is also a standalone CLI (has its own `PrismaClient`) separate from `lib/prisma.ts`.
- **Why it matters:** Duplication; two PrismaClient instances in the scripts module vs the lib singleton. Minor maintainability cost.
- **Suggested fix:** Export the batching helper from `scripts/seed.ts` and reuse it in the route; consider using the shared `lib/prisma` client in the script too.

#### L3 — Magic numbers for batch size and export cap
- **File:** `src/routes/upload.ts:20` (`BATCH_SIZE = 1000`), `src/routes/seed.ts:17` (`BATCH = 1000`), `frontend/src/pages/Logs.tsx:11` (`EXPORT_ALL_CAP = 10000`), `frontend/src/pages/Logs.tsx:87` (`perPage = 1000`)
- **Description:** Batches of 1000 and export cap 10k are hardcoded in multiple places.
- **Why it matters:** Low; if the backend `perPage` max (100, `get-logs.ts:8`) is enforced, the frontend `fetchAllFiltered` `perPage=1000` request would be clamped to 100 by Zod — **this is a real bug** (see L4).
- **Suggested fix:** Centralize constants; ensure the frontend export pagination respects the backend `perPage` max of 100.

#### L4 — Frontend `fetchAllFiltered` requests `perPage=1000` but backend caps at 100
- **File:** `frontend/src/pages/Logs.tsx:87` vs `src/routes/get-logs.ts:8`
- **Description:** `fetchAllFiltered` sets `perPage: 1000`, but the backend Zod schema clamps `perPage` to `max(100)` with `.default(20)`. The clamp silently reduces each page to 100, so the export loop fetches 10× more pages to reach 10k (still correct final count, but 10× the number of HTTP round-trips and `count` queries). No data loss, but inefficient and surprising.
- **Why it matters:** Performance; also proves the frontend and backend contracts have drifted (frontend assumes perPage can be 1000).
- **Suggested fix:** Set `perPage: 100` in `fetchAllFiltered` (the true backend max) — fewer round-trips, matches contract.

### Nit

#### N1 — Portuguese/English mixed user-facing strings
- **Files:** throughout (`upload.ts` "Arquivo processado...", `Dashboard.tsx` "Carregando dashboard...").
- **Note:** Consistent within the app (Portuguese UI + English code identifiers). Not a defect; flag only if i18n is desired.

#### N2 — `Distribution` pie `Cell` fallback uses `COLORS.INFO`
- **File:** `frontend/src/pages/Dashboard.tsx:215`
- **Description:** `COLORS[entry.level as Level] || COLORS.INFO`. Since `entry.level` always matches a level, the fallback is dead, but it hides a potential mismatch if the API ever returns an unknown level.
- **Suggested fix:** Keep as defensive default; optionally log on fallback.

#### N3 — `importedCount` state declared after its first use in `handleUpload`
- **File:** `frontend/src/pages/Upload.tsx:82` (used) vs `:99` (declared)
- **Description:** `useState(0)` for `importedCount` is declared near the bottom of the component body, after `handleUpload` references `setImportedCount`. This works due to closure hoisting of the setter, but it is poor readability.
- **Suggested fix:** Move the `useState` declarations to the top with the other state.

#### N4 — `prompt`/script files write to CWD
- **File:** `src/scripts/generate-mock-file.ts:13` (`writeFileSync(out, ...)` with default `mock-logs.log` in CWD)
- **Description:** Default output is relative to process CWD; harmless for a dev script.
- **Suggested fix:** Optionally default to an absolute temp path.

---

## Spec Conformance Table

| Requirement (source) | Status | Notes |
|---|---|---|
| Backend: Ingest via upload, batches of 1000, 201 `{message, imported}` | ✅ Pass | `upload.ts` matches; `imported` returned. |
| Backend: Missing file → 400 `{error}` | ✅ Pass | `upload.ts:10-12`. |
| Backend: List/filter logs, `data`+`meta`, ts desc, 400 on invalid perPage | ✅ Pass | `get-logs.ts`; tested. |
| Backend: `levels` multi-select (`levels=ERROR&levels=WARN`) | 🟡 Partial | Works only for repeated-param form; single value & comma form 400 (H1). |
| Backend: `service` filter contains/insensitive | ✅ Pass | `get-logs.ts:28-33`; no index (M3). |
| Backend: date-range inclusive `startDate`/`endDate` | ✅ Pass | `get-logs.ts:42-46`. |
| Backend: metrics `summary.total`, `distribution`, `trends` (30d default) | ✅ Pass | `metrics.ts`. |
| Backend: metrics `trendsByLevel` (pivoted by level) | ✅ Pass | `metrics.ts:60-84`; only days present in DB seeded. |
| Backend: `service`/`message` indexed — schema has `[timestamp]`,`[level]` only | 🟡 Partial | Schema matches spec literally (spec only requires timestamp+level indexes). `service` not indexed (M3). |
| Frontend: Sidebar layout w/ `<Outlet/>` | ✅ Pass | `AppLayout.tsx`. |
| Frontend: Dashboard total + line + pie from `/metrics` | ✅ Pass | `Dashboard.tsx`. |
| Frontend: Dashboard date-range presets + auto-refresh 30s | ✅ Pass | `Dashboard.tsx:83-95`; interval cleaned up. |
| Frontend: Per-level trend lines w/ color map | ✅ Pass | `Dashboard.tsx:183-194`. |
| Frontend: Log explorer search + pagination, reset page on search | ✅ Pass | `Logs.tsx`; tested. |
| Frontend: Multi-level + service + date filters, active-filter indicator | ✅ Pass | `Logs.tsx:79-84,220`. |
| Frontend: Log detail expand w/ highlighted search term | ✅ Pass | `Logs.tsx:260-285`. |
| Frontend: Export current page (CSV/JSON) | ✅ Pass | `Logs.tsx:110-113`. |
| Frontend: Export all filtered, cap 10k, note if truncated | 🟡 Partial | Implemented & capped, but `perPage=1000` is silently clamped to 100 by backend (L4). |
| Frontend: Upload drag-drop + client validation + progress + server error surfaced | ✅ Pass | `Upload.tsx`; tested. |
| Infra: `docker-compose.yml` Postgres 15, user/pass/db/volume | ✅ Pass | Matches infra spec. |
| Infra: Prisma schema source of truth, `DATABASE_URL` | ✅ Pass | `schema.prisma`, `lib/prisma.ts`. |
| Infra: `vercel.json` SPA rewrite | ✅ Pass | Present; root dir/build settings are Vercel-project config, not in repo (see below). |

---

## Test / CI Status

Command outputs (run during this review):

- **Backend typecheck:** `cd /home/az1nn/fullstack-log-tower && npx tsc --noEmit` → **PASS** (exit 0, no errors).
- **Frontend typecheck:** `cd frontend && npx tsc --noEmit` → **PASS** (exit 0, no errors). `strict`, `noUnusedLocals`, `noUnusedParameters` all on.
- **Backend unit tests (mocked):** `npx vitest run` → **8 passed / 3 files** (`metrics`, `upload`, `get-logs`).
- **Frontend tests:** `cd frontend && npx vitest run` → **16 passed / 4 files** (`Dashboard`, `Logs`, `Upload` ×.test; plus setup). (React Router v7 future-flag warnings and recharts "width(0) height(0)" warnings are benign in jsdom.)
- **Integration tests (real Postgres):** Not executed here (no Docker/Postgres available in this environment). The suite exists and is wired in CI.

Dynamic verification performed:
- Confirmed the `levels` Zod array parsing behavior against a live Fastify+Zod instance (H1): single-value → 400, comma → 400, repeated → OK.
- Confirmed no remaining duplicate `"test"` script key in either `package.json` (user already fixed; the second key is now `"openspec"`).

Test coverage assessment:
- **Good:** happy-path for all four routes/pages; Zod 400 on bad `perPage`; upload success/400; metrics shape; level-filter param emission.
- **Gaps / flaky-prone:**
  - No test for `levels` single-value or comma form (would have caught H1).
  - No test for `service`, `startDate`/`endDate` filters or the 400 path on bad dates.
  - No backend test for `metrics` date-range branch or `trendsByLevel` pivot logic.
  - Mocked tests use `mockPrisma` but several route behaviors (e.g. `meta` math, `hasNextPage`) are only loosely asserted.
  - No frontend test for export (CSV/JSON) content or the 10k truncation path; no test for `service`/date inputs.
  - No error-state test for `Dashboard`/`Logs` fetch failure (only `console.error` swallow — see M-area note under Frontend quality).
  - Integration tests don't assert `trendsByLevel` shape or `distribution` completeness.

---

## Prioritized Recommendations

1. **(High) Fix `levels` parsing** — adopt `z.preprocess` string→array coercion in `get-logs.ts:10` so single-value and comma inputs parse; add tests. (H1)
2. **(High) Lock down CORS** — replace `origin: true` with an explicit allowlist (`server.ts:12`). (H2)
3. **(Medium) Align frontend export `perPage`** — change `Logs.tsx:87` from `1000` to `100` to match backend max and cut round-trips 10×. (L4)
4. **(Medium) Add `service` index + consider `message` text index** in `schema.prisma` for filter scalability. (M3)
5. **(Medium) Harden CI integration step** — use an explicit file path / vitest filter instead of `src/**/integration.test.ts` shell glob. (M5)
6. **(Medium) Normalize `distribution`** to always include all five levels (0 when absent). (M1)
7. **(Medium) Document/explicitly handle `level` vs `levels` precedence.** (M6)
8. **(Low) Remove stray `back.md`/`front.md`** or relocate into `docs/`. (L1)
9. **(Low) Deduplicate batch-insert logic** between `seed.ts` route and `scripts/seed.ts`; reuse shared Prisma client. (L2)
10. **(Low) Centralize magic numbers** (batch 1000, export cap 10000) as named constants. (L3)
11. **(Nit) Move `importedCount` state declaration** to the top of `Upload.tsx`. (N3)
12. **(Nit) Reconsider 24h preset** given daily-only trend bucketing, or bucket by hour for short windows. (M4)

### Positive notes
- Both `tsc --noEmit` and all vitest suites are green on every stack.
- Spec → implementation traceability is excellent; every delta spec scenario has a corresponding UI/route.
- Frontend hook dependency arrays, interval cleanup, and React keys are correct (no obvious re-render or leak bugs).
- `$queryRaw` usages parameterize `filterStartDate`/`filterEndDate` via tagged-template interpolation — **no SQL injection surface** there.
- AGENTS.md conventions honored: no stray code comments, existing patterns followed, no new dependencies introduced.
