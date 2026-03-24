-- CreateEnum
CREATE TYPE "TransactionCategory" AS ENUM ('FOOD_AND_DRINK', 'SHOPPING', 'TRANSPORTATION', 'HOUSING', 'ENTERTAINMENT', 'HEALTH', 'PERSONAL', 'INCOME', 'TRANSFER', 'UTILITIES', 'SUBSCRIPTIONS', 'UNCATEGORIZED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateTable
CREATE TABLE "NormalizedTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "financialAccountId" TEXT NOT NULL,
    "rawTransactionId" TEXT NOT NULL,
    "plaidTransactionId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "isoCurrencyCode" TEXT NOT NULL DEFAULT 'USD',
    "date" TIMESTAMP(3) NOT NULL,
    "displayName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "merchantName" TEXT,
    "category" "TransactionCategory" NOT NULL DEFAULT 'UNCATEGORIZED',
    "transactionType" "TransactionType" NOT NULL,
    "pending" BOOLEAN NOT NULL DEFAULT false,
    "duplicateOf" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NormalizedTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NormalizedTransaction_rawTransactionId_key" ON "NormalizedTransaction"("rawTransactionId");

-- CreateIndex
CREATE INDEX "NormalizedTransaction_userId_date_idx" ON "NormalizedTransaction"("userId", "date");

-- CreateIndex
CREATE INDEX "NormalizedTransaction_userId_isActive_date_idx" ON "NormalizedTransaction"("userId", "isActive", "date");

-- CreateIndex
CREATE INDEX "NormalizedTransaction_financialAccountId_idx" ON "NormalizedTransaction"("financialAccountId");

-- CreateIndex
CREATE INDEX "NormalizedTransaction_plaidTransactionId_idx" ON "NormalizedTransaction"("plaidTransactionId");

-- AddForeignKey
ALTER TABLE "NormalizedTransaction" ADD CONSTRAINT "NormalizedTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NormalizedTransaction" ADD CONSTRAINT "NormalizedTransaction_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "FinancialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NormalizedTransaction" ADD CONSTRAINT "NormalizedTransaction_rawTransactionId_fkey" FOREIGN KEY ("rawTransactionId") REFERENCES "RawTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
