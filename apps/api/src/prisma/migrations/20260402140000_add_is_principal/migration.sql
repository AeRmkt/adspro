-- AlterTable
ALTER TABLE "AdAccount" ADD COLUMN "isPrincipal" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "InstagramAccount" ADD COLUMN "isPrincipal" BOOLEAN NOT NULL DEFAULT false;
