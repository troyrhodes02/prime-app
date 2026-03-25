import { prisma } from "@/lib/prisma";
import type {
  PrismaClient,
  FinancialBaseline,
  TransactionCategory,
} from "@prisma/client";

const TRANSFER_PATTERNS = [
  /transfer/i,
  /xfer/i,
  /\bmove\b.*\b(funds|money)\b/i,
  /^online transfer/i,
  /^ach transfer/i,
  /^wire transfer/i,
];

const DAYS_PER_MONTH = 30.44;
const MIN_DAY_SPAN = 30;
const MIN_SPENDING_DAYS_FOR_TRIM = 14;
const TRIM_PERCENTAGE = 0.05;

interface TransactionRow {
  id: string;
  amountCents: number;
  date: Date;
  transactionType: "INCOME" | "EXPENSE";
  category: TransactionCategory;
  displayName: string;
  financialAccountId: string;
}

function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

function isTransferByName(displayName: string): boolean {
  return TRANSFER_PATTERNS.some((p) => p.test(displayName));
}

function isTransferByCategory(category: TransactionCategory): boolean {
  return category === "TRANSFER";
}

function detectReciprocalTransfers(txns: TransactionRow[]): Set<string> {
  const transferIds = new Set<string>();

  const byDate = new Map<string, TransactionRow[]>();
  for (const t of txns) {
    const key = formatDateKey(t.date);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(t);
  }

  for (const [, dayTxns] of byDate) {
    if (dayTxns.length < 2) continue;

    const incomes = dayTxns.filter((t) => t.transactionType === "INCOME");
    const expenses = dayTxns.filter((t) => t.transactionType === "EXPENSE");

    for (const inc of incomes) {
      for (const exp of expenses) {
        if (
          Math.abs(inc.amountCents) === exp.amountCents &&
          inc.financialAccountId !== exp.financialAccountId
        ) {
          transferIds.add(inc.id);
          transferIds.add(exp.id);
        }
      }
    }
  }

  return transferIds;
}

function differenceInDays(a: Date, b: Date): number {
  const msPerDay = 86400000;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utcA - utcB) / msPerDay);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

interface BaselineData {
  status: "READY" | "INSUFFICIENT_DATA";
  monthlyIncomeCents: number;
  monthlySpendingCents: number;
  availableCents: number;
  windowDays: number;
  transactionCount: number;
  oldestTransactionDate: Date;
  newestTransactionDate: Date;
}

async function upsertBaseline(
  userId: string,
  data: BaselineData,
  client: PrismaClient,
): Promise<FinancialBaseline> {
  return client.financialBaseline.upsert({
    where: { userId },
    create: {
      userId,
      ...data,
      computedAt: new Date(),
    },
    update: {
      ...data,
      computedAt: new Date(),
    },
  });
}

export async function computeBaseline(
  userId: string,
  tx?: PrismaClient,
): Promise<FinancialBaseline> {
  const client = tx ?? prisma;

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - 90);

  const transactions: TransactionRow[] =
    await client.normalizedTransaction.findMany({
      where: {
        userId,
        isActive: true,
        pending: false,
        date: { gte: windowStart },
      },
      orderBy: { date: "asc" },
      select: {
        id: true,
        amountCents: true,
        date: true,
        transactionType: true,
        category: true,
        displayName: true,
        financialAccountId: true,
      },
    });

  const epoch = new Date(0);

  // No transactions at all
  if (transactions.length === 0) {
    return upsertBaseline(
      userId,
      {
        status: "INSUFFICIENT_DATA",
        monthlyIncomeCents: 0,
        monthlySpendingCents: 0,
        availableCents: 0,
        windowDays: 0,
        transactionCount: 0,
        oldestTransactionDate: epoch,
        newestTransactionDate: epoch,
      },
      client,
    );
  }

  const oldestDate = transactions[0].date;
  const newestDate = transactions[transactions.length - 1].date;
  const daySpan = differenceInDays(newestDate, oldestDate);

  // Insufficient history
  if (daySpan < MIN_DAY_SPAN) {
    return upsertBaseline(
      userId,
      {
        status: "INSUFFICIENT_DATA",
        monthlyIncomeCents: 0,
        monthlySpendingCents: 0,
        availableCents: 0,
        windowDays: daySpan,
        transactionCount: transactions.length,
        oldestTransactionDate: oldestDate,
        newestTransactionDate: newestDate,
      },
      client,
    );
  }

  // Step 3: Filter transfers — category + name
  const nonTransferTxns = transactions.filter(
    (t) => !isTransferByCategory(t.category) && !isTransferByName(t.displayName),
  );

  // Step 3b: Reciprocal matching
  const reciprocalTransferIds = detectReciprocalTransfers(nonTransferTxns);
  const cleanTxns = nonTransferTxns.filter(
    (t) => !reciprocalTransferIds.has(t.id),
  );

  // Step 4: Compute monthly income
  const incomeTxns = cleanTxns.filter((t) => t.transactionType === "INCOME");
  const totalIncomeCents = incomeTxns.reduce(
    (sum, t) => sum + Math.abs(t.amountCents),
    0,
  );

  const actualWindowDays = daySpan + 1; // inclusive
  const monthlyIncomeCents = Math.round(
    (totalIncomeCents / actualWindowDays) * DAYS_PER_MONTH,
  );

  // Step 5: Compute monthly spending (trimmed mean)
  const expenseTxns = cleanTxns.filter((t) => t.transactionType === "EXPENSE");

  const dailySpending = new Map<string, number>();
  for (const t of expenseTxns) {
    const key = formatDateKey(t.date);
    dailySpending.set(key, (dailySpending.get(key) ?? 0) + t.amountCents);
  }

  // Fill in zero-spending days within the window
  const allDays: number[] = [];
  for (let d = new Date(oldestDate); d <= newestDate; d = addDays(d, 1)) {
    const key = formatDateKey(d);
    allDays.push(dailySpending.get(key) ?? 0);
  }

  // Trimmed mean: remove top 5% of spending days
  const sorted = [...allDays].sort((a, b) => a - b);
  const spendingDayCount = sorted.filter((v) => v > 0).length;

  let trimmedDailyTotals: number[];
  if (spendingDayCount >= MIN_SPENDING_DAYS_FOR_TRIM) {
    const trimCount = Math.max(1, Math.floor(sorted.length * TRIM_PERCENTAGE));
    trimmedDailyTotals = sorted.slice(0, sorted.length - trimCount);
  } else {
    trimmedDailyTotals = sorted;
  }

  const trimmedSum = trimmedDailyTotals.reduce((sum, v) => sum + v, 0);
  const trimmedMean = trimmedDailyTotals.length > 0
    ? trimmedSum / trimmedDailyTotals.length
    : 0;
  const monthlySpendingCents = Math.round(trimmedMean * DAYS_PER_MONTH);

  // Step 6: Compute available and persist
  const availableCents = monthlyIncomeCents - monthlySpendingCents;

  return upsertBaseline(
    userId,
    {
      status: "READY",
      monthlyIncomeCents,
      monthlySpendingCents,
      availableCents,
      windowDays: actualWindowDays,
      transactionCount: cleanTxns.length,
      oldestTransactionDate: oldestDate,
      newestTransactionDate: newestDate,
    },
    client,
  );
}
