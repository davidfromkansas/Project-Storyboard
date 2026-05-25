-- AlterTable
ALTER TABLE "Slide" ADD COLUMN "imageStatus" TEXT NOT NULL DEFAULT 'pending';

-- Backfill: slides with an imageUrl are "completed", those without are "failed" (since the job already ran)
UPDATE "Slide" SET "imageStatus" = 'completed' WHERE "imageUrl" IS NOT NULL;
UPDATE "Slide" SET "imageStatus" = 'failed' WHERE "imageUrl" IS NULL;
