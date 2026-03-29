/*
  Warnings:

  - The values [OVERDUE] on the enum `SessionStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `height` on the `Space` table. All the data in the column will be lost.
  - You are about to drop the column `posX` on the `Space` table. All the data in the column will be lost.
  - You are about to drop the column `posY` on the `Space` table. All the data in the column will be lost.
  - You are about to drop the column `width` on the `Space` table. All the data in the column will be lost.
  - You are about to drop the column `department` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `isHost` on the `UserOnStudySession` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[floor]` on the table `FloorPlan` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `points` to the `Space` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SpaceShape" AS ENUM ('CIRCULAR_DESK', 'RETANGULAR_DESK');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'EXPIRED');

-- AlterEnum
BEGIN;
CREATE TYPE "SessionStatus_new" AS ENUM ('ACTIVE', 'COMPLETED', 'EXPIRED');
ALTER TABLE "StudySession" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "StudySession" ALTER COLUMN "status" TYPE "SessionStatus_new" USING ("status"::text::"SessionStatus_new");
ALTER TYPE "SessionStatus" RENAME TO "SessionStatus_old";
ALTER TYPE "SessionStatus_new" RENAME TO "SessionStatus";
DROP TYPE "SessionStatus_old";
ALTER TABLE "StudySession" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterTable
ALTER TABLE "Space" DROP COLUMN "height",
DROP COLUMN "posX",
DROP COLUMN "posY",
DROP COLUMN "width",
ADD COLUMN     "points" TEXT NOT NULL,
ADD COLUMN     "shape" "SpaceShape";

-- AlterTable
ALTER TABLE "StudySession" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "department",
DROP COLUMN "name",
ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "UserOnStudySession" DROP COLUMN "isHost";

-- CreateTable
CREATE TABLE "Report" (
    "id" VARCHAR(30) NOT NULL,
    "reporterId" VARCHAR(30) NOT NULL,
    "sessionId" VARCHAR(30) NOT NULL,
    "reason" VARCHAR(255) NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timeToConfirm" TIMESTAMP(3) NOT NULL DEFAULT now() + interval '10 minutes',
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportConfirmation" (
    "reportId" VARCHAR(30) NOT NULL,
    "userId" VARCHAR(30) NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportConfirmation_pkey" PRIMARY KEY ("reportId","userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "FloorPlan_floor_key" ON "FloorPlan"("floor");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StudySession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportConfirmation" ADD CONSTRAINT "ReportConfirmation_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportConfirmation" ADD CONSTRAINT "ReportConfirmation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
