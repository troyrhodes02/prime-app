-- CreateEnum
CREATE TYPE "BaselineStatus" AS ENUM ('READY', 'INSUFFICIENT_DATA', 'STALE');

-- CreateTable
CREATE TABLE "FinancialBaseline" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monthlyIncomeCents" INTEGER NOT NULL,
    "monthlySpendingCents" INTEGER NOT NULL,
    "availableCents" INTEGER NOT NULL,
    "windowDays" INTEGER NOT NULL,
    "transactionCount" INTEGER NOT NULL,
    "oldestTransactionDate" TIMESTAMP(3) NOT NULL,
    "newestTransactionDate" TIMESTAMP(3) NOT NULL,
    "status" "BaselineStatus" NOT NULL DEFAULT 'INSUFFICIENT_DATA',
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialBaseline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinancialBaseline_userId_key" ON "FinancialBaseline"("userId");

-- CreateIndex
CREATE INDEX "FinancialBaseline_userId_idx" ON "FinancialBaseline"("userId");

-- AddForeignKey
ALTER TABLE "FinancialBaseline" ADD CONSTRAINT "FinancialBaseline_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
