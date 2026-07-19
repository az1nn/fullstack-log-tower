-- Re-adds per-file upload idempotency: nullable upload_id + a (non-unique) index.
-- All rows of one uploaded file share the same upload_id. A UNIQUE index would
-- collide within a single multi-row file, so we use a plain index and check
-- existence in the route to decide duplicates. Idempotent re-apply.
-- AlterTable
ALTER TABLE "Log" ADD COLUMN IF NOT EXISTS "upload_id" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Log_upload_id_key" ON "Log"("upload_id");
