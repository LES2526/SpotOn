/*
  Warnings:

  - The primary key for the `accounts` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `userId` on the `accounts` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(30)`.
  - You are about to alter the column `type` on the `accounts` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `provider` on the `accounts` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `providerAccountId` on the `accounts` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `token_type` on the `accounts` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `session_state` on the `accounts` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `sessionToken` on the `sessions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `userId` on the `sessions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(30)`.
  - The primary key for the `verification_tokens` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `identifier` on the `verification_tokens` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `token` on the `verification_tokens` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.

*/
-- DropForeignKey
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_userId_fkey";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_userId_fkey";

-- AlterTable
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_pkey",
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(30),
ALTER COLUMN "type" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "provider" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "providerAccountId" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "token_type" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "session_state" SET DATA TYPE VARCHAR(255),
ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("provider", "providerAccountId");

-- AlterTable
ALTER TABLE "sessions" ALTER COLUMN "sessionToken" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(30);

-- AlterTable
ALTER TABLE "verification_tokens" DROP CONSTRAINT "verification_tokens_pkey",
ALTER COLUMN "identifier" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "token" SET DATA TYPE VARCHAR(255),
ADD CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("identifier", "token");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
