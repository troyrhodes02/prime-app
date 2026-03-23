-- CreateEnum
CREATE TYPE "PlaidItemStatus" AS ENUM ('CONNECTING', 'ACTIVE', 'ERROR', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('DEPOSITORY', 'CREDIT', 'LOAN', 'INVESTMENT', 'BROKERAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "SyncJobType" AS ENUM ('INITIAL', 'REFRESH');

-- CreateEnum
CREATE TYPE "SyncJobStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "SyncStep" AS ENUM ('CONNECTING', 'SYNCING_BALANCES', 'RETRIEVING_TRANSACTIONS', 'ANALYZING', 'DONE');

-- CreateTable
CREATE TABLE "PlaidItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plaidItemId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "institutionId" TEXT,
    "institutionName" TEXT,
    "status" "PlaidItemStatus" NOT NULL DEFAULT 'CONNECTING',
    "consentExpiresAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaidItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plaidItemId" TEXT NOT NULL,
    "plaidAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "officialName" TEXT,
    "type" "AccountType" NOT NULL,
    "subtype" TEXT,
    "mask" TEXT,
    "currentBalanceCents" INTEGER,
    "availableBalanceCents" INTEGER,
    "isoCurrencyCode" TEXT,
    "unofficialCurrencyCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plaidItemId" TEXT NOT NULL,
    "type" "SyncJobType" NOT NULL,
    "status" "SyncJobStatus" NOT NULL DEFAULT 'PENDING',
    "step" "SyncStep" NOT NULL DEFAULT 'CONNECTING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "accountsSynced" INTEGER NOT NULL DEFAULT 0,
    "transactionsSynced" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "financialAccountId" TEXT NOT NULL,
    "plaidTransactionId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "isoCurrencyCode" TEXT,
    "unofficialCurrencyCode" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "authorizedDate" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "merchantName" TEXT,
    "category" TEXT[],
    "pending" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RawTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlaidItem_plaidItemId_key" ON "PlaidItem"("plaidItemId");

-- CreateIndex
CREATE INDEX "PlaidItem_userId_idx" ON "PlaidItem"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialAccount_plaidAccountId_key" ON "FinancialAccount"("plaidAccountId");

-- CreateIndex
CREATE INDEX "FinancialAccount_userId_idx" ON "FinancialAccount"("userId");

-- CreateIndex
CREATE INDEX "FinancialAccount_plaidItemId_idx" ON "FinancialAccount"("plaidItemId");

-- CreateIndex
CREATE INDEX "SyncJob_userId_idx" ON "SyncJob"("userId");

-- CreateIndex
CREATE INDEX "SyncJob_plaidItemId_idx" ON "SyncJob"("plaidItemId");

-- CreateIndex
CREATE UNIQUE INDEX "RawTransaction_plaidTransactionId_key" ON "RawTransaction"("plaidTransactionId");

-- CreateIndex
CREATE INDEX "RawTransaction_userId_idx" ON "RawTransaction"("userId");

-- CreateIndex
CREATE INDEX "RawTransaction_financialAccountId_idx" ON "RawTransaction"("financialAccountId");

-- CreateIndex
CREATE INDEX "RawTransaction_date_idx" ON "RawTransaction"("date");

-- AddForeignKey
ALTER TABLE "PlaidItem" ADD CONSTRAINT "PlaidItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_plaidItemId_fkey" FOREIGN KEY ("plaidItemId") REFERENCES "PlaidItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncJob" ADD CONSTRAINT "SyncJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncJob" ADD CONSTRAINT "SyncJob_plaidItemId_fkey" FOREIGN KEY ("plaidItemId") REFERENCES "PlaidItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawTransaction" ADD CONSTRAINT "RawTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawTransaction" ADD CONSTRAINT "RawTransaction_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "FinancialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
