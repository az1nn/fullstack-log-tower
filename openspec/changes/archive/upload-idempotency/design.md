# Design: upload idempotency

## Approach
1. **Schema/migration** — re-add `upload_id String?` to `Log` and a unique index
   `Log_upload_id_key` on it. Postgres treats NULLs as distinct, so rows without an
   `upload_id` (from `/api/logs/push` or legacy seed) never collide. Every batch of
   an upload uses the SAME `upload_id`, so a second upload of the identical file
   collides on every row → counted as `duplicates`.
2. **upload_id derivation** — `crypto.createHash('sha256').update(buffer).digest('hex')`
   over the raw file buffer read in the route. Deterministic per file content.
3. **Insert + P2002 handling** — `createMany` is not atomic per-row on conflict, so we
   catch `Prisma.PrismaClientKnownRequestError` with `code === 'P2002'`. Because all
   rows in a re-upload share one `upload_id`, a single P2002 means the file was already
   imported; we count the whole batch as `duplicates` and continue to the next batch.
   (No `skipDuplicates` is used because that silently drops rows and we want an explicit
   count.)
4. **Response** — `{ message, imported, skipped, duplicates }`. `message` is chosen by
   the frontend-facing logic: e.g. `"File already imported"` when `imported===0 &&
   duplicates>0`.
5. **Frontend** — `Upload.tsx` reads `duplicates`; when `> 0` it renders an amber
   "already imported" banner; otherwise the normal success banner. `isUploading` guard
   stays to prevent accidental double-submits within one session.

## Key decisions
- Per-file (not content-line) dedup — matches the agreed design; different files with
  overlapping lines are still both imported.
- Unique index on a nullable column (not composite) keeps the change minimal and
  reuses the exact previous column shape, easing migration review.
- Report duplicates explicitly rather than silently skipping — this is what fixes the
  original broken UX.

## Risks
- Large files: whole-file buffer in memory (already the current behavior) — acceptable.
- P2002 granularity: a partially-imported file (upload interrupted mid-batch) could on
  retry show mixed imported/duplicates. Acceptable; the count is still accurate.
