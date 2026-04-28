-- AlterEnum
ALTER TYPE "JoinRequestStatus" ADD VALUE 'ACCEPTED';

-- AlterTable
ALTER TABLE "Report" ALTER COLUMN "timeToConfirm" SET DEFAULT now() + interval '10 minutes';
