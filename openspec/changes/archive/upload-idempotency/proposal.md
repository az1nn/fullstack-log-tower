# Re-add upload idempotency (per-file)

## Why
The per-file idempotency column was removed (migration `2_drop_upload_id`) because it
surfaced as a broken UX: re-uploading the same file returned `imported: 0` /
`duplicates: N` with no explanation, looking like logs were lost. The underlying
capability — not inserting the same file twice — is still wanted. This change
re-adds it with a clear contract: a visible duplicate report on re-upload.

## What changes
- Add an `upload_id` column + unique index back (new migration `3_*`).
- Backend derives `upload_id` = SHA-256 of the uploaded file content. Every parsed
  row carries that `upload_id`.
- Inserts use `createMany` with P2002 handling: rows that collide on the unique
  index are counted as `duplicates` instead of failing the whole batch.
- Response changes from `{ message, imported, skipped }` to
  `{ message, imported, skipped, duplicates }`.
- Frontend Upload page shows a distinct "already imported" banner when
  `duplicates > 0` (and `imported === 0`).

## Impact
- API contract change for `/api/logs/upload` (adds `duplicates`).
- DB migration adds one nullable column + one unique index.
- No effect on `/api/logs/push` or the seed endpoint.
