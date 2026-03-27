/**
 * Expense Classification Service
 *
 * Classifies expense transactions as FIXED or FLEXIBLE using category
 * defaults and recurrence detection. Aggregates totals and persists
 * the ExpenseClassification summary.
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type {
  ClassificationConfidence,
  ExpenseClassification,
  ExpenseType,
  PrismaClient,
  TransactionCategory,
} from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TransactionInput {
  id: string;
  amountCents: number;
  date: Date;
  merchantName: string | null;
  displayName: string;
}

export interface RecurrenceSignal {
  merchantKey: string;
  isRecurring: boolean;
  confidence: ClassificationConfidence;
  avgAmountCents: number;
  transactionCount: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum transactions per merchant to evaluate recurrence */
const MIN_TRANSACTIONS = 2;

/** Monthly cadence window bounds (days) */
const MONTHLY_MIN_DAYS = 25;
const MONTHLY_MAX_DAYS = 35;

/** Minimum ratio of intervals that must be monthly */
const MONTHLY_RATIO_THRESHOLD = 0.6;

/** Coefficient of variation threshold for HIGH confidence */
const CV_HIGH_THRESHOLD = 0.1;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalize a merchant identifier for grouping.
 * Uses merchantName if available, otherwise displayName.
 * Lowercased and trimmed for consistent grouping.
 */
export function normalizeMerchantKey(
  merchantName: string | null,
  displayName: string,
): string {
  const raw = merchantName || displayName;
  return raw.toLowerCase().trim();
}

/**
 * Compute the number of days between two dates (UTC, ignoring time).
 */
function daysBetween(a: Date, b: Date): number {
  const msPerDay = 86_400_000;
  const utcA = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const utcB = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round(Math.abs(utcB - utcA) / msPerDay);
}

// ---------------------------------------------------------------------------
// Core: Recurrence Detection
// ---------------------------------------------------------------------------

/**
 * Detect whether a group of transactions from the same merchant
 * represents a monthly recurring charge.
 *
 * Pure function — no side effects, no database access.
 *
 * @param transactions - All transactions for a single merchant (same merchantKey)
 * @returns RecurrenceSignal with isRecurring, confidence, and stats
 */
export function detectRecurrence(
  transactions: TransactionInput[],
): RecurrenceSignal {
  if (transactions.length === 0) {
    throw new Error("detectRecurrence requires at least one transaction");
  }

  const merchantKey = normalizeMerchantKey(
    transactions[0].merchantName,
    transactions[0].displayName,
  );

  // Not enough transactions to detect a pattern
  if (transactions.length < MIN_TRANSACTIONS) {
    return {
      merchantKey,
      isRecurring: false,
      confidence: "LOW",
      avgAmountCents: transactions[0].amountCents,
      transactionCount: transactions.length,
    };
  }

  // Sort by date ascending (stable sort by date, then by id for determinism)
  const sorted = [...transactions].sort((a, b) => {
    const dateDiff = a.date.getTime() - b.date.getTime();
    if (dateDiff !== 0) return dateDiff;
    return a.id.localeCompare(b.id);
  });

  // Compute intervals between consecutive transactions
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    intervals.push(daysBetween(sorted[i].date, sorted[i - 1].date));
  }

  // Monthly cadence check: what fraction of intervals fall in 25-35 day range?
  const monthlyIntervals = intervals.filter(
    (d) => d >= MONTHLY_MIN_DAYS && d <= MONTHLY_MAX_DAYS,
  );
  const monthlyRatio = monthlyIntervals.length / intervals.length;
  const hasMonthlyPattern = monthlyRatio >= MONTHLY_RATIO_THRESHOLD;

  // Amount consistency check: coefficient of variation (stddev / mean)
  const amounts = sorted.map((t) => t.amountCents);
  const mean = amounts.reduce((sum, v) => sum + v, 0) / amounts.length;
  const variance =
    amounts.reduce((sum, v) => sum + (v - mean) ** 2, 0) / amounts.length;
  const stddev = Math.sqrt(variance);
  const cv = mean > 0 ? stddev / mean : Infinity;

  // Average amount (rounded to integer cents)
  const avgAmountCents = Math.round(mean);

  // Recurrence requires monthly cadence as a prerequisite.
  // CV distinguishes HIGH from MEDIUM when cadence is present.
  if (hasMonthlyPattern) {
    const confidence: ClassificationConfidence =
      cv <= CV_HIGH_THRESHOLD ? "HIGH" : "MEDIUM";
    return {
      merchantKey,
      isRecurring: true,
      confidence,
      avgAmountCents,
      transactionCount: sorted.length,
    };
  }

  // LOW: no recurring pattern detected
  return {
    merchantKey,
    isRecurring: false,
    confidence: "LOW",
    avgAmountCents,
    transactionCount: sorted.length,
  };
}

// ---------------------------------------------------------------------------
// Batch Detection
// ---------------------------------------------------------------------------

/**
 * Group transactions by merchant and run recurrence detection on each group.
 *
 * @param transactions - All expense transactions to analyze
 * @returns Map of merchantKey → RecurrenceSignal
 */
export function detectRecurrenceForAll(
  transactions: TransactionInput[],
): Map<string, RecurrenceSignal> {
  // Group by normalized merchant key
  const groups = new Map<string, TransactionInput[]>();

  for (const txn of transactions) {
    const key = normalizeMerchantKey(txn.merchantName, txn.displayName);
    const group = groups.get(key);
    if (group) {
      group.push(txn);
    } else {
      groups.set(key, [txn]);
    }
  }

  // Run detection on each group
  const results = new Map<string, RecurrenceSignal>();
  for (const [key, group] of groups) {
    results.set(key, detectRecurrence(group));
  }

  return results;
}

// ---------------------------------------------------------------------------
// Classification Constants
// ---------------------------------------------------------------------------

const DAYS_PER_MONTH = 30.44;
const MIN_DAY_SPAN = 30;

const TRANSFER_PATTERNS = [
  /transfer/i,
  /xfer/i,
  /\bmove\b.*\b(funds|money)\b/i,
  /^online transfer/i,
  /^ach transfer/i,
  /^wire transfer/i,
];

export const CATEGORY_DEFAULT_TYPE: Record<TransactionCategory, ExpenseType> = {
  HOUSING: "FIXED",
  UTILITIES: "FIXED",
  SUBSCRIPTIONS: "FIXED",
  TRANSPORTATION: "FLEXIBLE",
  FOOD_AND_DRINK: "FLEXIBLE",
  SHOPPING: "FLEXIBLE",
  ENTERTAINMENT: "FLEXIBLE",
  HEALTH: "FLEXIBLE",
  PERSONAL: "FLEXIBLE",
  UNCATEGORIZED: "FLEXIBLE",
  INCOME: "FLEXIBLE",
  TRANSFER: "FLEXIBLE",
};

export const CATEGORY_LABELS: Record<string, string> = {
  HOUSING: "Housing",
  UTILITIES: "Utilities",
  SUBSCRIPTIONS: "Subscriptions",
  TRANSPORTATION: "Transportation",
  FOOD_AND_DRINK: "Food & Drink",
  SHOPPING: "Shopping",
  ENTERTAINMENT: "Entertainment",
  HEALTH: "Health",
  PERSONAL: "Personal",
  UNCATEGORIZED: "Other",
};

// ---------------------------------------------------------------------------
// Classification Types
// ---------------------------------------------------------------------------

interface ClassifiedTransaction {
  id: string;
  amountCents: number;
  category: TransactionCategory;
  merchantKey: string;
  expenseType: ExpenseType;
  confidence: ClassificationConfidence;
}

interface CategoryBreakdownEntry {
  category: string;
  label: string;
  totalCents: number;
  pct: number;
}

// ---------------------------------------------------------------------------
// Transaction Classification
// ---------------------------------------------------------------------------

/**
 * Classify a single transaction as FIXED or FLEXIBLE with confidence.
 *
 * Rules:
 * 1. FIXED categories (HOUSING, UTILITIES, SUBSCRIPTIONS) → always FIXED, HIGH confidence
 * 2. FLEXIBLE categories + recurring merchant → override to FIXED
 * 3. FLEXIBLE categories + not recurring → stay FLEXIBLE
 */
export function classifyTransaction(
  categoryDefault: ExpenseType,
  recurrenceSignal: RecurrenceSignal | undefined,
): { expenseType: ExpenseType; confidence: ClassificationConfidence } {
  // Fixed categories stay fixed with high confidence
  if (categoryDefault === "FIXED") {
    return { expenseType: "FIXED", confidence: "HIGH" };
  }

  // Flexible categories can be overridden by recurrence
  if (recurrenceSignal?.isRecurring) {
    return {
      expenseType: "FIXED",
      confidence: recurrenceSignal.confidence === "HIGH" ? "HIGH" : "MEDIUM",
    };
  }

  // Default flexible — confidence based on recurrence analysis availability
  const confidence: ClassificationConfidence = recurrenceSignal
    ? (recurrenceSignal.confidence === "LOW" ? "HIGH" : "MEDIUM")
    : "MEDIUM";

  return { expenseType: "FLEXIBLE", confidence };
}

// ---------------------------------------------------------------------------
// Category Breakdown
// ---------------------------------------------------------------------------

function buildCategoryBreakdown(
  transactions: ClassifiedTransaction[],
  windowDays: number,
): CategoryBreakdownEntry[] {
  const byCategory = new Map<string, number>();

  for (const t of transactions) {
    const current = byCategory.get(t.category) ?? 0;
    byCategory.set(t.category, current + t.amountCents);
  }

  const entries = Array.from(byCategory.entries()).map(([category, rawCents]) => ({
    category,
    label: CATEGORY_LABELS[category] ?? category,
    totalCents: Math.round((rawCents / windowDays) * DAYS_PER_MONTH),
  }));

  const grandTotal = entries.reduce((s, e) => s + e.totalCents, 0);

  return entries
    .map((e) => ({
      ...e,
      pct: grandTotal > 0 ? Math.round((e.totalCents / grandTotal) * 100) : 0,
    }))
    .sort((a, b) => b.totalCents - a.totalCents);
}

// ---------------------------------------------------------------------------
// Core Pipeline
// ---------------------------------------------------------------------------

function isTransferByName(displayName: string): boolean {
  return TRANSFER_PATTERNS.some((p) => p.test(displayName));
}

function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

interface TransferDetectionRow {
  id: string;
  amountCents: number;
  date: Date;
  displayName: string;
  financialAccountId: string;
}

function detectReciprocalTransfers(
  expenseTxns: TransferDetectionRow[],
  allTxns: Array<TransferDetectionRow & { transactionType: string }>,
): Set<string> {
  const transferIds = new Set<string>();

  const byDate = new Map<string, Array<TransferDetectionRow & { transactionType: string }>>();
  for (const t of allTxns) {
    const key = formatDateKey(t.date);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(t);
  }

  const expenseIds = new Set(expenseTxns.map((t) => t.id));

  for (const [, dayTxns] of byDate) {
    if (dayTxns.length < 2) continue;

    const incomes = dayTxns.filter((t) => t.transactionType === "INCOME");
    const expenses = dayTxns.filter((t) => expenseIds.has(t.id));

    for (const inc of incomes) {
      for (const exp of expenses) {
        if (
          Math.abs(inc.amountCents) === exp.amountCents &&
          inc.financialAccountId !== exp.financialAccountId
        ) {
          transferIds.add(exp.id);
        }
      }
    }
  }

  return transferIds;
}

function differenceInDaysClassification(a: Date, b: Date): number {
  const msPerDay = 86_400_000;
  const utcA = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const utcB = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.floor((utcA - utcB) / msPerDay);
}



/**
 * Full expense classification pipeline.
 *
 * 1. Query expense transactions (90-day window)
 * 2. Filter transfers (name-based + reciprocal detection)
 * 3. Validate sufficient data
 * 4. Apply category defaults + recurrence override
 * 5. Clear stale labels on previously-classified ineligible transactions
 * 6. Persist per-transaction classification
 * 7. Aggregate and persist ExpenseClassification summary
 */
export async function computeExpenseClassification(
  userId: string,
  tx?: PrismaClient,
): Promise<ExpenseClassification> {
  const client = tx ?? prisma;

  const now = new Date();
  const windowStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 90),
  );

  // Step 1: Query expense transactions
  const rawTransactions = await client.normalizedTransaction.findMany({
    where: {
      userId,
      isActive: true,
      pending: false,
      transactionType: "EXPENSE",
      date: { gte: windowStart },
      category: { notIn: ["INCOME", "TRANSFER"] },
    },
    orderBy: { date: "asc" },
    select: {
      id: true,
      amountCents: true,
      date: true,
      category: true,
      merchantName: true,
      displayName: true,
      financialAccountId: true,
    },
  });

  // Step 1b: Filter transfers by name pattern
  const afterNameFilter = rawTransactions.filter(
    (t) => !isTransferByName(t.displayName),
  );

  // Step 1c: Reciprocal transfer detection — need INCOME transactions for matching
  const incomeTxns = await client.normalizedTransaction.findMany({
    where: {
      userId,
      isActive: true,
      pending: false,
      transactionType: "INCOME",
      date: { gte: windowStart },
    },
    select: {
      id: true,
      amountCents: true,
      date: true,
      displayName: true,
      financialAccountId: true,
      transactionType: true,
    },
  });

  const allForReciprocal = [
    ...afterNameFilter.map((t) => ({ ...t, transactionType: "EXPENSE" as const })),
    ...incomeTxns,
  ];
  const reciprocalIds = detectReciprocalTransfers(afterNameFilter, allForReciprocal);
  const transactions = afterNameFilter.filter((t) => !reciprocalIds.has(t.id));

  const epoch = new Date(0);

  // Step 2: Validate sufficient data
  if (transactions.length === 0) {
    return upsertClassification(userId, {
      status: "INSUFFICIENT_DATA",
      fixedCents: 0,
      flexibleCents: 0,
      fixedPct: 0,
      flexiblePct: 0,
      fixedCategories: [],
      flexibleCategories: [],
      windowDays: 0,
      transactionCount: 0,
      oldestTransactionDate: epoch,
      newestTransactionDate: epoch,
    }, client);
  }

  const oldestDate = transactions[0].date;
  const newestDate = transactions[transactions.length - 1].date;
  const daySpan = differenceInDaysClassification(newestDate, oldestDate);

  if (daySpan < MIN_DAY_SPAN) {
    return upsertClassification(userId, {
      status: "INSUFFICIENT_DATA",
      fixedCents: 0,
      flexibleCents: 0,
      fixedPct: 0,
      flexiblePct: 0,
      fixedCategories: [],
      flexibleCategories: [],
      windowDays: daySpan,
      transactionCount: transactions.length,
      oldestTransactionDate: oldestDate,
      newestTransactionDate: newestDate,
    }, client);
  }

  // Step 3: Run recurrence detection
  const recurrenceInputs: TransactionInput[] = transactions.map((t) => ({
    id: t.id,
    amountCents: t.amountCents,
    date: t.date,
    merchantName: t.merchantName,
    displayName: t.displayName,
  }));

  const recurrenceSignals = detectRecurrenceForAll(recurrenceInputs);

  // Step 4: Classify each transaction
  const classified: ClassifiedTransaction[] = transactions.map((t) => {
    const merchantKey = normalizeMerchantKey(t.merchantName, t.displayName);
    const categoryDefault = CATEGORY_DEFAULT_TYPE[t.category];
    const signal = recurrenceSignals.get(merchantKey);
    const { expenseType, confidence } = classifyTransaction(categoryDefault, signal);

    return {
      id: t.id,
      amountCents: t.amountCents,
      category: t.category,
      merchantKey,
      expenseType,
      confidence,
    };
  });

  // Step 5a: Clear stale classification on transactions no longer eligible
  const classifiedIds = classified.map((t) => t.id);
  await client.normalizedTransaction.updateMany({
    where: {
      userId,
      expenseType: { not: null },
      id: { notIn: classifiedIds },
    },
    data: {
      expenseType: null,
      classificationConfidence: null,
    },
  });

  // Step 5b: Batch-persist per-transaction classification
  // Group by (expenseType, confidence) to minimize DB round trips
  const updateGroups = new Map<string, string[]>();
  for (const t of classified) {
    const key = `${t.expenseType}:${t.confidence}`;
    const group = updateGroups.get(key);
    if (group) {
      group.push(t.id);
    } else {
      updateGroups.set(key, [t.id]);
    }
  }

  for (const [key, ids] of updateGroups) {
    const [expenseType, confidence] = key.split(":") as [ExpenseType, ClassificationConfidence];
    await client.normalizedTransaction.updateMany({
      where: { id: { in: ids } },
      data: { expenseType, classificationConfidence: confidence },
    });
  }

  // Step 6: Aggregate
  const actualWindowDays = daySpan + 1; // inclusive

  const fixed = classified.filter((t) => t.expenseType === "FIXED");
  const flexible = classified.filter((t) => t.expenseType === "FLEXIBLE");

  const rawFixedCents = fixed.reduce((s, t) => s + t.amountCents, 0);
  const rawFlexibleCents = flexible.reduce((s, t) => s + t.amountCents, 0);

  const monthlyFixedCents = Math.round(
    (rawFixedCents / actualWindowDays) * DAYS_PER_MONTH,
  );
  const monthlyFlexibleCents = Math.round(
    (rawFlexibleCents / actualWindowDays) * DAYS_PER_MONTH,
  );
  const monthlyTotalCents = monthlyFixedCents + monthlyFlexibleCents;

  const fixedPct =
    monthlyTotalCents > 0
      ? Math.round((monthlyFixedCents / monthlyTotalCents) * 100)
      : 0;
  const flexiblePct = monthlyTotalCents > 0 ? 100 - fixedPct : 0;

  const fixedCategories = buildCategoryBreakdown(fixed, actualWindowDays);
  const flexibleCategories = buildCategoryBreakdown(flexible, actualWindowDays);

  // Step 7: Persist summary
  return upsertClassification(userId, {
    status: "READY",
    fixedCents: monthlyFixedCents,
    flexibleCents: monthlyFlexibleCents,
    fixedPct,
    flexiblePct,
    fixedCategories,
    flexibleCategories,
    windowDays: actualWindowDays,
    transactionCount: classified.length,
    oldestTransactionDate: oldestDate,
    newestTransactionDate: newestDate,
  }, client);
}

// ---------------------------------------------------------------------------
// Persistence Helper
// ---------------------------------------------------------------------------

interface ClassificationData {
  status: "READY" | "INSUFFICIENT_DATA";
  fixedCents: number;
  flexibleCents: number;
  fixedPct: number;
  flexiblePct: number;
  fixedCategories: CategoryBreakdownEntry[];
  flexibleCategories: CategoryBreakdownEntry[];
  windowDays: number;
  transactionCount: number;
  oldestTransactionDate: Date;
  newestTransactionDate: Date;
}

async function upsertClassification(
  userId: string,
  data: ClassificationData,
  client: PrismaClient,
): Promise<ExpenseClassification> {
  const payload = {
    ...data,
    fixedCategories: data.fixedCategories as unknown as Prisma.InputJsonValue,
    flexibleCategories: data.flexibleCategories as unknown as Prisma.InputJsonValue,
    computedAt: new Date(),
  };

  return client.expenseClassification.upsert({
    where: { userId },
    create: { userId, ...payload },
    update: payload,
  });
}
