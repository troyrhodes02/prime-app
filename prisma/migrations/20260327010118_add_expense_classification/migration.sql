-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('FIXED', 'FLEXIBLE');

-- CreateEnum
CREATE TYPE "ClassificationConfidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "ClassificationStatus" AS ENUM ('READY', 'INSUFFICIENT_DATA');

-- AlterTable
ALTER TABLE "NormalizedTransaction" ADD COLUMN     "classificationConfidence" "ClassificationConfidence",
ADD COLUMN     "expenseType" "ExpenseType";

-- CreateTable
CREATE TABLE "ExpenseClassification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fixedCents" INTEGER NOT NULL,
    "flexibleCents" INTEGER NOT NULL,
    "fixedPct" INTEGER NOT NULL,
    "flexiblePct" INTEGER NOT NULL,
    "fixedCategories" JSONB NOT NULL,
    "flexibleCategories" JSONB NOT NULL,
    "windowDays" INTEGER NOT NULL,
    "transactionCount" INTEGER NOT NULL,
    "oldestTransactionDate" TIMESTAMP(3) NOT NULL,
    "newestTransactionDate" TIMESTAMP(3) NOT NULL,
    "status" "ClassificationStatus" NOT NULL DEFAULT 'INSUFFICIENT_DATA',
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseClassification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseClassification_userId_key" ON "ExpenseClassification"("userId");

-- AddForeignKey
ALTER TABLE "ExpenseClassification" ADD CONSTRAINT "ExpenseClassification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
