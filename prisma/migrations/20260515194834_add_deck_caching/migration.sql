/*
  Warnings:

  - You are about to drop the column `exaResponse` on the `ContentCache` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,urlHash]` on the table `ContentCache` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `deckId` to the `ContentCache` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `ContentCache` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ContentCache" DROP COLUMN "exaResponse",
ADD COLUMN     "contentHash" TEXT,
ADD COLUMN     "deckId" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Deck" ADD COLUMN     "contentHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ContentCache_userId_urlHash_key" ON "ContentCache"("userId", "urlHash");

-- AddForeignKey
ALTER TABLE "ContentCache" ADD CONSTRAINT "ContentCache_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
