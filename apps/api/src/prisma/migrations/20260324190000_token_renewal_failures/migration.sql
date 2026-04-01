-- CreateTable: auditoria de falhas na renovação automática de tokens Meta
CREATE TABLE "TokenRenewalFailure" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fbUserName" TEXT NOT NULL,
    "error" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 3,
    "failedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenRenewalFailure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TokenRenewalFailure_userId_idx" ON "TokenRenewalFailure"("userId");

-- CreateIndex
CREATE INDEX "TokenRenewalFailure_failedAt_idx" ON "TokenRenewalFailure"("failedAt");
