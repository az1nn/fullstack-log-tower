# Tasks: upload idempotency

- [ ] Add `upload_id String?` to `Log` model in `prisma/schema.prisma`
- [ ] Create migration `3_add_upload_id` (add column + unique index, idempotent `IF EXISTS`)
- [ ] Update `src/routes/upload.ts` to derive `upload_id` (SHA-256 of file buffer) and attach to each insert row
- [ ] Handle `P2002` in the upload insert loop: count colliding rows as `duplicates`
- [ ] Change route response to `{ message, imported, skipped, duplicates }`
- [ ] Update frontend `frontend/src/pages/Upload.tsx` to show an "already imported" banner when `duplicates > 0`
- [ ] Update `openspec/specs/backend/spec.md` Idempotency requirement (now enabled) + `frontend/spec.md` duplicate scenario
- [ ] Update `AGENTS.md` API contract for `/api/logs/upload`
- [ ] Run backend `npx tsc --noEmit`, `npx vitest run`, and the upload integration test
- [ ] Run frontend `npx tsc --noEmit` and `npx vitest run`
- [ ] Verify end-to-end: upload a file twice, confirm second returns `duplicates > 0`, screenshot upload page
- [ ] Commit spec, then commit implementation; push
