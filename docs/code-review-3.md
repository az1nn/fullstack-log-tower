# Code Review — Fullstack Log Tower (Round 3)

> Review + spec-sync. No source/config code was modified this round — all prior functional
> findings were already resolved in code; the only changes are **spec accuracy updates** to keep
> `openspec/specs/` as the faithful source of truth. Verification commands all pass.

Review date: 2026-07-16

---

## Summary

**Conformance verdict: GREEN.** All four implemented changes' requirements are satisfied and the
code matches the contracts. Round-2 findings M1 (custom date handling), M2 (CI Postgres readiness
wait), L1 (upload `service=` parse), L5 (empty-date crash) are **already FIXED in code** (confirmed:
`Dashboard.tsx:56-71` guards empty dates + appends time; `ci.yml:20-29` has the wait loop;
`upload.ts:23` parses `(service=...)`). No new correctness/runtime/security bugs were found.

The only real work this round was **spec drift**: the source-of-truth specs lagged the implemented
behavior. Updates made (see Spec Updates): upload 201 `{message, imported, skipped}`, upload
`(service=)` suffix + unknown-level→INFO normalization, `distribution` always 5 levels +
`trendsByLevel` shape, `service` index in schema, frontend metrics/export/upload detail.

### Top findings

| ID | Sev | Area | Issue | Action |
|----|-----|------|-------|--------|
| H1 | — | — | (Round-2 HIGH already fixed) `levels` parsing | Verified fixed (`get-logs.ts:10-17`) |
| H2 | — | — | (Round-2 HIGH already fixed) CORS allowlist | Verified fixed (`server.ts:12-14`) |
| M1 | — | — | (Round-2 MEDIUM) custom date range | Verified fixed (`Dashboard.tsx:56-71`) |
| M2 | — | — | (Round-2 MEDIUM) CI DB readiness | Verified fixed (`ci.yml:20-29`) |
| M3 | — | — | `level` vs `levels` precedence | Already documented in spec; PASS |
| **L1** | LOW | Spec | Upload 201 `skipped` + `service=` suffix undocumented | **Spec updated** |
| **L2** | LOW | Spec | `service` index missing from backend "Persist" requirement | **Spec updated** |
| **L3** | LOW | Spec | `distribution` 5-level / `trendsByLevel` shape undocumented in source spec | **Spec updated** |
| **L4** | LOW | Spec | Frontend metrics/export/upload detail drift | **Spec updated** |
| N1 | NIT | Security | `CORS_ORIGINS=""` yields allowlist `['']` (empty origin accepted) | Noted; low risk for dev scope |

---

## HIGH
None.

## MEDIUM
None (all round-2 MEDIUM items confirmed resolved in code).

## LOW
### L1 — Upload 201 response shape & `(service=)` suffix undocumented
- **File:** `src/routes/upload.ts:23,52-56` vs `openspec/specs/backend/spec.md:9-16`
- **What:** Code returns `{message, imported, skipped}` and parses a trailing `(service=name)` suffix, and normalizes unknown levels to `INFO`. The source spec only documented `{message, imported}` and the base 3-group pattern.
- **Fix:** Updated backend source spec (upload scenarios) + upload-ux-validation delta spec to record `skipped`, the `service=` suffix, and unknown-level normalization.

### L2 — `service` index absent from backend "Persist" spec
- **File:** `prisma/schema.prisma:28` (`@@index([service])`) vs `openspec/specs/backend/spec.md:38-43`
- **What:** Schema has a `service` index (superset of spec). Spec claimed only `[timestamp]`/`[level]`.
- **Fix:** Updated backend spec "Persist logs" requirement + scenario to list the `service` index.

### L3 — `distribution`/`trendsByLevel` shape undocumented in source spec
- **File:** `src/routes/metrics.ts:41-97` vs `openspec/specs/backend/spec.md:31-36`
- **What:** `distribution` is always exactly 5 levels (zeros filled); `trendsByLevel` is one object/day with the five level keys, sorted ascending. Delta spec had it; source spec did not.
- **Fix:** Added two scenarios to the backend metrics requirement.

### L4 — Frontend source spec drift
- **File:** `frontend/src/pages/*` vs `openspec/specs/frontend/spec.md`
- **What:** Frontend renders per-level line chart from `trendsByLevel`, 5-level pie, date-range + 30s auto-refresh with inclusive custom-date normalization, upload `imported`/`skipped`, and export cap 10k with `-truncated-10k` suffix. Source spec was thinner than the delta specs.
- **Fix:** Synced frontend source spec (Dashboard / Upload / Log explorer scenarios).

## NIT
### N1 — `CORS_ORIGINS=""` accepts empty origin
- **File:** `src/server.ts:13` — `process.env.CORS_ORIGINS?.split(',')` on `""` → `['']`.
- **Risk:** A request with `Origin: ""` (rare) would be allowed. Low impact for local dev. Optional future hardening: filter empty strings / default when list is empty.

---

## Spec Updates

| Spec file | Change | Why |
|---|---|---|
| `openspec/specs/backend/spec.md` | Upload scenarios: added `service=` suffix capture, `skipped` count, unknown-level→INFO normalization; 201 shape now `{message, imported, skipped}` | Code correct; spec was under-specified (L1) |
| `openspec/specs/backend/spec.md` | "Persist logs" requirement + scenario now lists `@@index([service])` | Schema superset; spec lagged (L2) |
| `openspec/specs/backend/spec.md` | Metrics scenarios: added "Distribution always returns all levels" and "Per-level trend shape" + ISO-datetime date-filter note | Code correct; shape undocumented in source (L3) |
| `openspec/specs/frontend/spec.md` | Dashboard / Upload / Log-explorer scenarios expanded (per-level line, 5-level pie, 30s auto-refresh + inclusive custom dates, `imported`/`skipped`, 10k export cap) | Sync source spec to implemented delta behavior (L4) |
| `openspec/changes/upload-ux-validation/specs/backend/spec.md` | 201 shape → `{message, imported: number, skipped: number}` | Match source spec + code |

No code changed; no tests added (existing tests already cover these behaviors).

---

## Spec Conformance

| Implemented change / requirement | Status | Evidence |
|---|---|---|
| **upload-ux-validation** — upload 201 `{message, imported}` (+ `skipped`) | ✅ PASS | `upload.ts:52-56` (returns `skipped`); spec now matches |
| **upload-ux-validation** — missing file 400 `{error}` | ✅ PASS | `upload.ts:10-12` |
| **upload-ux-validation** — `(service=)` suffix parsed | ✅ PASS | `upload.ts:23,29,34`; test `upload.test.ts:85-119` |
| **upload-ux-validation** — drag-drop + client validation + progress + server error | ✅ PASS | `Upload.tsx:17-98` |
| **log-filtering-ui** — `levels=ERROR&levels=WARN` multi-select | ✅ PASS | `get-logs.ts:10-17,31-32` |
| **log-filtering-ui** — `service` contains case-insensitive | ✅ PASS | `get-logs.ts:37-42` |
| **log-filtering-ui** — date range inclusive | ✅ PASS | `get-logs.ts:51-55` |
| **log-filtering-ui** — `levels` precedence over `level` | ✅ PASS | `get-logs.ts:31-35`; spec documents it |
| **log-detail-export** — log detail expand + highlight | ✅ PASS | `Logs.tsx:261-286` |
| **log-detail-export** — export current page CSV/JSON | ✅ PASS | `Logs.tsx:111-114`, `export.ts` |
| **log-detail-export** — export all filtered, cap 10k, `-truncated-10k` | ✅ PASS | `Logs.tsx:87-128` |
| **dashboard-controls** — `summary`/`distribution`/`trends`/`trendsByLevel` | ✅ PASS | `metrics.ts:92-97`; `distribution` 5-level verified |
| **dashboard-controls** — per-level trend lines w/ color map | ✅ PASS | `Dashboard.tsx:182-201` |
| **dashboard-controls** — date presets + custom + auto-refresh 30s | ✅ PASS | `Dashboard.tsx:35-102` (inclusive custom dates, no crash) |
| **infra** — Postgres 15 compose | ✅ PASS | `docker-compose.yml` |
| **infra** — Prisma source of truth / `DATABASE_URL` | ✅ PASS | `schema.prisma`, `lib/prisma.ts` |
| **infra** — `service` index (superset of spec) | ✅ PASS | `schema.prisma:28`; spec now reflects it |

---

## Verification (all pass)

- Backend `npx tsc --noEmit` → PASS
- Backend `npx vitest run` → 14 passed (3 files)
- Frontend `npx tsc --noEmit` → PASS
- Frontend `npx vitest run` → 17 passed (4 files)

### Notes
- No genuine new bugs found; code is conformant. Only spec accuracy was improved.
- NIT N1 (`CORS_ORIGINS=""`) is the single remaining hardening suggestion; left as-is per dev-scope.
