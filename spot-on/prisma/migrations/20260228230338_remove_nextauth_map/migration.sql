-- CreateEnum
CREATE TYPE "SpaceType" AS ENUM ('INDIVIDUAL_DESK', 'GROUP_ROOM');

-- AlterTable: Remove points from User
ALTER TABLE "User" DROP COLUMN "points";

-- CreateTable
CREATE TABLE "FloorPlan" (
    "id" VARCHAR(30) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "floor" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" VARCHAR(255) NOT NULL,
    "imageWidth" INTEGER NOT NULL,
    "imageHeight" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FloorPlan_pkey" PRIMARY KEY ("id")
);

-- DropForeignKey
ALTER TABLE "StudySession" DROP CONSTRAINT "StudySession_spaceId_fkey";

-- DropIndex
DROP INDEX "Space_currentQrToken_key";

-- DropTable
DROP TABLE "Space";

-- CreateTable
CREATE TABLE "Space" (
    "id" VARCHAR(30) NOT NULL,
    "floorPlanId" VARCHAR(30) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "posX" DOUBLE PRECISION NOT NULL,
    "posY" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "capacity" INTEGER NOT NULL,
    "currentQrToken" VARCHAR(255) NOT NULL,
    "description" VARCHAR(255),
    "hasPowerOutlet" BOOLEAN NOT NULL DEFAULT false,
    "type" "SpaceType" NOT NULL DEFAULT 'INDIVIDUAL_DESK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Space_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Space_currentQrToken_key" ON "Space"("currentQrToken");

-- AddForeignKey
ALTER TABLE "Space" ADD CONSTRAINT "Space_floorPlanId_fkey" FOREIGN KEY ("floorPlanId") REFERENCES "FloorPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
