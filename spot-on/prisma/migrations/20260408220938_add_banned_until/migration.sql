-- AlterTable
ALTER TABLE "Report" ALTER COLUMN "timeToConfirm" SET DEFAULT now() + interval '10 minutes';

-- AlterTable
ALTER TABLE "Space" ADD COLUMN     "hasComputer" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasInteractiveBoard" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bannedUntil" TIMESTAMP(3);
