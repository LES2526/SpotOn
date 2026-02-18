/*
 Warnings:
 
 - You are about to drop the `UserOnSession` table. If the table is not empty, all the data it contains will be lost.
 
 */
-- DropForeignKey
ALTER TABLE
    "UserOnSession" DROP CONSTRAINT "UserOnSession_sessionId_fkey";

-- DropForeignKey
ALTER TABLE
    "UserOnSession" DROP CONSTRAINT "UserOnSession_userId_fkey";

-- DropTable
DROP TABLE "UserOnSession";

-- CreateTable
CREATE TABLE "UserOnStudySession" (
    "userId" VARCHAR(30) NOT NULL,
    "sessionId" VARCHAR(30) NOT NULL,
    "isHost" BOOLEAN NOT NULL DEFAULT false,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserOnStudySession_pkey" PRIMARY KEY ("userId", "sessionId")
);

-- AddForeignKey
ALTER TABLE
    "UserOnStudySession"
ADD
    CONSTRAINT "UserOnStudySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
    "UserOnStudySession"
ADD
    CONSTRAINT "UserOnStudySession_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "study_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
