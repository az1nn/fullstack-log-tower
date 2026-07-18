-- Drop the per-file idempotency column. Idempotency is intentionally
-- disabled for now (see openspec/specs/backend/spec.md "Idempotency" note)
-- so that re-uploads and generated mock logs always insert. The unique
-- constraint was causing every re-upload of identical content to be reported
-- as duplicates (imported: 0), which surfaced as a broken UX. Idempotency will
-- be re-added later with a clearer design.

ALTER TABLE "Log" DROP CONSTRAINT IF EXISTS "Log_upload_id_key";
ALTER TABLE "Log" DROP COLUMN IF EXISTS "upload_id";
