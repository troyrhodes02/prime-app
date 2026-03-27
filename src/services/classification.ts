/**
 * Expense Classification Service — Recurrence Detection Engine (PRI-33)
 *
 * Pure function that detects monthly recurring transactions by merchant
 * using cadence analysis and amount consistency checks.
 */

import type { ClassificationConfidence } from "@prisma/client";

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
