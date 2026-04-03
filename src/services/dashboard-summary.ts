import { prisma } from "@/lib/prisma";
import type { DashboardPeriod } from "@/lib/dashboard-period";
import {
  DAYS_PER_MONTH,
  isTransferByName,
  isTransferByCategory,
  detectReciprocalTransfers,
  type TransactionRow,
} from "@/services/baseline";

interface SummaryTransaction extends TransactionRow {
  expenseType: "FIXED" | "FLEXIBLE" | null;
}

export interface DashboardSummaryResult {
  status: "ready" | "no_data";
  incomeCents: number;
  spendingCents: number;
  availableCents: number;
  fixedCents: number;
  flexibleCents: number;
  fixedPct: number;
  flexiblePct: number;
  windowDays: number;
  transactionCount: number;
}

function getWindowStart(period: DashboardPeriod): Date {
  const now = new Date();

  if (period === "this_month") {
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
  }

  const days = period === "last_30" ? 30 : period === "last_60" ? 60 : 90;
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - days,
    ),
  );
}

function getWindowDays(period: DashboardPeriod): number {
  const now = new Date();

  if (period === "this_month") {
    return now.getUTCDate();
  }

  return period === "last_30" ? 30 : period === "last_60" ? 60 : 90;
}

export async function computeDashboardSummary(
  userId: string,
  period: DashboardPeriod,
): Promise<DashboardSummaryResult> {
  const windowStart = getWindowStart(period);
  const windowDays = getWindowDays(period);
  const isThisMonth = period === "this_month";

  const now = new Date();
  const dateFilter: { gte: Date; lt?: Date } = { gte: windowStart };
  if (isThisMonth) {
    dateFilter.lt = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    );
  }

  const transactions: SummaryTransaction[] =
    await prisma.normalizedTransaction.findMany({
      where: {
        userId,
        isActive: true,
        pending: false,
        date: dateFilter,
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
        expenseType: true,
      },
    });

  if (transactions.length === 0) {
    return {
      status: "no_data",
      incomeCents: 0,
      spendingCents: 0,
      availableCents: 0,
      fixedCents: 0,
      flexibleCents: 0,
      fixedPct: 0,
      flexiblePct: 0,
      windowDays,
      transactionCount: 0,
    };
  }

  // Filter transfers — category + name
  const nonTransferTxns = transactions.filter(
    (t) =>
      !isTransferByCategory(t.category) && !isTransferByName(t.displayName),
  );

  // Reciprocal matching
  const reciprocalIds = detectReciprocalTransfers(nonTransferTxns);
  const cleanTxns = nonTransferTxns.filter((t) => !reciprocalIds.has(t.id));

  if (cleanTxns.length === 0) {
    return {
      status: "no_data",
      incomeCents: 0,
      spendingCents: 0,
      availableCents: 0,
      fixedCents: 0,
      flexibleCents: 0,
      fixedPct: 0,
      flexiblePct: 0,
      windowDays,
      transactionCount: 0,
    };
  }

  // Income: sum absolute values
  const rawIncomeCents = cleanTxns
    .filter((t) => t.transactionType === "INCOME")
    .reduce((sum, t) => sum + Math.abs(t.amountCents), 0);

  // Spending: sum expense amounts
  const expenseTxns = cleanTxns.filter(
    (t) => t.transactionType === "EXPENSE",
  );
  const rawSpendingCents = expenseTxns.reduce(
    (sum, t) => sum + t.amountCents,
    0,
  );

  // Classification breakdown from persisted expenseType
  let rawFixedCents = 0;
  let rawFlexibleCents = 0;
  for (const t of expenseTxns) {
    if (t.expenseType === "FIXED") {
      rawFixedCents += t.amountCents;
    } else if (t.expenseType === "FLEXIBLE") {
      rawFlexibleCents += t.amountCents;
    }
  }

  // Annualize for rolling windows; raw sums for this_month
  let incomeCents: number;
  let spendingCents: number;
  let fixedCents: number;
  let flexibleCents: number;

  if (isThisMonth) {
    incomeCents = rawIncomeCents;
    spendingCents = rawSpendingCents;
    fixedCents = rawFixedCents;
    flexibleCents = rawFlexibleCents;
  } else {
    const scale = DAYS_PER_MONTH / windowDays;
    incomeCents = Math.round(rawIncomeCents * scale);
    spendingCents = Math.round(rawSpendingCents * scale);
    fixedCents = Math.round(rawFixedCents * scale);
    flexibleCents = Math.round(rawFlexibleCents * scale);
  }

  const availableCents = incomeCents - spendingCents;

  const classifiedTotal = fixedCents + flexibleCents;
  const fixedPct =
    classifiedTotal > 0 ? Math.round((fixedCents / classifiedTotal) * 100) : 0;
  const flexiblePct = classifiedTotal > 0 ? 100 - fixedPct : 0;

  return {
    status: "ready",
    incomeCents,
    spendingCents,
    availableCents,
    fixedCents,
    flexibleCents,
    fixedPct,
    flexiblePct,
    windowDays,
    transactionCount: cleanTxns.length,
  };
}
