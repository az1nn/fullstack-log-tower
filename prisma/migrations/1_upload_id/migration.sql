-- AlterTable
ALTER TABLE "Log" ADD COLUMN "upload_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Log_upload_id_key" ON "Log"("upload_id");
