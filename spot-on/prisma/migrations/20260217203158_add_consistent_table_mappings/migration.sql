/*
  Warnings:

  - You are about to drop the column `password` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `UserOnStudySession` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[studentId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "UserOnStudySession" DROP CONSTRAINT "UserOnStudySession_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "UserOnStudySession" DROP CONSTRAINT "UserOnStudySession_userId_fkey";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "password",
ADD COLUMN     "department" VARCHAR(255),
ADD COLUMN     "emailVerified" TIMESTAMP(3),
ADD COLUMN     "studentId" VARCHAR(20),
ALTER COLUMN "name" DROP NOT NULL;

-- DropTable
DROP TABLE "UserOnStudySession";

-- CreateTable
CREATE TABLE "accounts" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "sessions" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "users_study_sessions" (
    "userId" VARCHAR(30) NOT NULL,
    "sessionId" VARCHAR(30) NOT NULL,
    "isHost" BOOLEAN NOT NULL DEFAULT false,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_study_sessions_pkey" PRIMARY KEY ("userId","sessionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "users_studentId_key" ON "users"("studentId");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users_study_sessions" ADD CONSTRAINT "users_study_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users_study_sessions" ADD CONSTRAINT "users_study_sessions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "study_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
