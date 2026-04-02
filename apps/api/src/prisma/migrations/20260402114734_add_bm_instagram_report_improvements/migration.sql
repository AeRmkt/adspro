-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "errorMsg" TEXT;

-- CreateTable
CREATE TABLE "BusinessManager" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bmId" TEXT NOT NULL,
    "bmName" TEXT NOT NULL,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessManager_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstagramAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "igAccountId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT,
    "profilePicUrl" TEXT,
    "followersCount" INTEGER,
    "mediaCount" INTEGER,
    "linkedPageId" TEXT NOT NULL,
    "linkedPageName" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessManager_userId_bmId_key" ON "BusinessManager"("userId", "bmId");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramAccount_userId_igAccountId_key" ON "InstagramAccount"("userId", "igAccountId");

-- AddForeignKey
ALTER TABLE "BusinessManager" ADD CONSTRAINT "BusinessManager_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramAccount" ADD CONSTRAINT "InstagramAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
