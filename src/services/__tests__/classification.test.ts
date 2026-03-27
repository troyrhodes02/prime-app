import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  detectRecurrence,
  detectRecurrenceForAll,
  normalizeMerchantKey,
  classifyTransaction,
  computeExpenseClassification,
  CATEGORY_DEFAULT_TYPE,
  CATEGORY_LABELS,
  type TransactionInput,
  type RecurrenceSignal,
} from "../classification";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDate(daysAgo: number): Date {
  return new Date(Date.UTC(2026, 2, 25 - daysAgo));
}

let txnCounter = 0;

function makeTxn(
  overrides: Partial<TransactionInput> & { daysAgo?: number } = {},
): TransactionInput {
  txnCounter++;
  return {
    id: overrides.id ?? `txn-${txnCounter}`,
    amountCents: overrides.amountCents ?? 10000,
    date: overrides.date ?? (overrides.daysAgo !== undefined ? makeDate(overrides.daysAgo) : makeDate(0)),
    merchantName: "merchantName" in overrides ? overrides.merchantName! : "Netflix",
    displayName: overrides.displayName ?? "NETFLIX.COM",
  };
}

/**
 * Create a set of monthly recurring transactions for a merchant.
 * Generates `count` transactions spaced `intervalDays` apart.
 */
function makeMonthlyMerchant(opts: {
  merchantName: string;
  amountCents: number;
  count: number;
  intervalDays?: number;
  startDaysAgo?: number;
}): TransactionInput[] {
  const interval = opts.intervalDays ?? 30;
  const startDaysAgo = opts.startDaysAgo ?? interval * (opts.count - 1);

  return Array.from({ length: opts.count }, (_, i) =>
    makeTxn({
      merchantName: opts.merchantName,
      displayName: opts.merchantName.toUpperCase(),
      amountCents: opts.amountCents,
      daysAgo: startDaysAgo - i * interval,
    }),
  );
}

// ---------------------------------------------------------------------------
// normalizeMerchantKey
// ---------------------------------------------------------------------------

describe("normalizeMerchantKey", () => {
  it("uses merchantName when available", () => {
    expect(normalizeMerchantKey("Netflix", "NETFLIX.COM")).toBe("netflix");
  });

  it("falls back to displayName when merchantName is null", () => {
    expect(normalizeMerchantKey(null, "NETFLIX.COM")).toBe("netflix.com");
  });

  it("trims whitespace", () => {
    expect(normalizeMerchantKey("  Netflix  ", "X")).toBe("netflix");
  });

  it("lowercases consistently", () => {
    expect(normalizeMerchantKey("SPOTIFY", "Y")).toBe("spotify");
  });
});

// ---------------------------------------------------------------------------
// detectRecurrence — Insufficient Data
// ---------------------------------------------------------------------------

describe("detectRecurrence — insufficient data", () => {
  it("returns LOW confidence for a single transaction", () => {
    const result = detectRecurrence([makeTxn({ merchantName: "Netflix" })]);

    expect(result.isRecurring).toBe(false);
    expect(result.confidence).toBe("LOW");
    expect(result.merchantKey).toBe("netflix");
    expect(result.transactionCount).toBe(1);
  });

  it("throws for empty array", () => {
    expect(() => detectRecurrence([])).toThrow(
      "detectRecurrence requires at least one transaction",
    );
  });
});

// ---------------------------------------------------------------------------
// detectRecurrence — HIGH confidence (monthly cadence + consistent amount)
// ---------------------------------------------------------------------------

describe("detectRecurrence — HIGH confidence", () => {
  it("detects 3 monthly transactions with exact same amount", () => {
    const txns = makeMonthlyMerchant({
      merchantName: "Netflix",
      amountCents: 1599,
      count: 3,
    });

    const result = detectRecurrence(txns);

    expect(result.isRecurring).toBe(true);
    expect(result.confidence).toBe("HIGH");
    expect(result.merchantKey).toBe("netflix");
    expect(result.avgAmountCents).toBe(1599);
    expect(result.transactionCount).toBe(3);
  });

  it("detects 4 monthly transactions with exact same amount", () => {
    const txns = makeMonthlyMerchant({
      merchantName: "Spotify",
      amountCents: 999,
      count: 4,
    });

    const result = detectRecurrence(txns);

    expect(result.isRecurring).toBe(true);
    expect(result.confidence).toBe("HIGH");
  });

  it("handles amounts with minor variation within CV ≤ 0.10", () => {
    // Mean = 10000, stddev must be ≤ 1000 for CV ≤ 0.10
    const txns = [
      makeTxn({ merchantName: "Gym", amountCents: 9900, daysAgo: 60 }),
      makeTxn({ merchantName: "Gym", amountCents: 10100, daysAgo: 30 }),
      makeTxn({ merchantName: "Gym", amountCents: 10000, daysAgo: 0 }),
    ];

    const result = detectRecurrence(txns);

    expect(result.isRecurring).toBe(true);
    expect(result.confidence).toBe("HIGH");
  });

  it("accepts intervals at boundary (25 and 35 days)", () => {
    const txns = [
      makeTxn({ merchantName: "Insurance", amountCents: 15000, daysAgo: 60 }),
      makeTxn({ merchantName: "Insurance", amountCents: 15000, daysAgo: 35 }), // 25-day interval
      makeTxn({ merchantName: "Insurance", amountCents: 15000, daysAgo: 0 }),  // 35-day interval
    ];

    const result = detectRecurrence(txns);

    expect(result.isRecurring).toBe(true);
    expect(result.confidence).toBe("HIGH");
  });
});

// ---------------------------------------------------------------------------
// detectRecurrence — MEDIUM confidence
// ---------------------------------------------------------------------------

describe("detectRecurrence — MEDIUM confidence", () => {
  it("monthly cadence but variable amounts (CV > 0.10)", () => {
    // Monthly intervals but amounts vary more than 10%
    const txns = [
      makeTxn({ merchantName: "Electric Co", amountCents: 8000, daysAgo: 60 }),
      makeTxn({ merchantName: "Electric Co", amountCents: 12000, daysAgo: 30 }),
      makeTxn({ merchantName: "Electric Co", amountCents: 10000, daysAgo: 0 }),
    ];

    const result = detectRecurrence(txns);

    expect(result.isRecurring).toBe(true);
    expect(result.confidence).toBe("MEDIUM");
  });

  it("consistent amounts (CV ≤ 0.15) but irregular cadence → not recurring", () => {
    // Very consistent amounts but intervals outside 25-35 range
    // Amount stability alone does not indicate monthly recurrence
    const txns = [
      makeTxn({ merchantName: "Subscription", amountCents: 2999, daysAgo: 80 }),
      makeTxn({ merchantName: "Subscription", amountCents: 3000, daysAgo: 40 }), // 40-day interval
      makeTxn({ merchantName: "Subscription", amountCents: 3001, daysAgo: 0 }),  // 40-day interval
    ];

    const result = detectRecurrence(txns);

    // No monthly cadence → not recurring, regardless of amount consistency
    expect(result.isRecurring).toBe(false);
    expect(result.confidence).toBe("LOW");
  });

  it("mixed intervals where 60% are monthly", () => {
    // 5 transactions → 4 intervals, need ≥60% monthly → ≥3 monthly intervals
    const txns = [
      makeTxn({ merchantName: "Service", amountCents: 5000, daysAgo: 130 }),
      makeTxn({ merchantName: "Service", amountCents: 5000, daysAgo: 100 }), // 30 days ✓
      makeTxn({ merchantName: "Service", amountCents: 5000, daysAgo: 70 }),  // 30 days ✓
      makeTxn({ merchantName: "Service", amountCents: 5000, daysAgo: 40 }),  // 30 days ✓
      makeTxn({ merchantName: "Service", amountCents: 5000, daysAgo: 0 }),   // 40 days ✗
    ];

    const result = detectRecurrence(txns);

    // 3/4 intervals are monthly (75% > 60%), amounts identical → HIGH
    expect(result.isRecurring).toBe(true);
    expect(result.confidence).toBe("HIGH");
  });
});

// ---------------------------------------------------------------------------
// detectRecurrence — LOW confidence (not recurring)
// ---------------------------------------------------------------------------

describe("detectRecurrence — LOW confidence (not recurring)", () => {
  it("irregular intervals and variable amounts", () => {
    const txns = [
      makeTxn({ merchantName: "Restaurant", amountCents: 2500, daysAgo: 80 }),
      makeTxn({ merchantName: "Restaurant", amountCents: 4200, daysAgo: 65 }), // 15 days
      makeTxn({ merchantName: "Restaurant", amountCents: 1800, daysAgo: 20 }), // 45 days
      makeTxn({ merchantName: "Restaurant", amountCents: 5500, daysAgo: 5 }),  // 15 days
    ];

    const result = detectRecurrence(txns);

    expect(result.isRecurring).toBe(false);
    expect(result.confidence).toBe("LOW");
  });

  it("identical amounts at irregular intervals → not recurring", () => {
    // Reviewer scenario: three $50 charges at non-monthly intervals
    // CV = 0 but no monthly cadence → must NOT be flagged as recurring
    const txns = [
      makeTxn({ merchantName: "Store", amountCents: 5000, daysAgo: 80 }),
      makeTxn({ merchantName: "Store", amountCents: 5000, daysAgo: 65 }), // 15 days
      makeTxn({ merchantName: "Store", amountCents: 5000, daysAgo: 0 }),  // 65 days
    ];

    const result = detectRecurrence(txns);

    expect(result.isRecurring).toBe(false);
    expect(result.confidence).toBe("LOW");
  });

  it("all intervals outside monthly range with high CV", () => {
    const txns = [
      makeTxn({ merchantName: "Store", amountCents: 500, daysAgo: 50 }),
      makeTxn({ merchantName: "Store", amountCents: 15000, daysAgo: 40 }),  // 10 days
      makeTxn({ merchantName: "Store", amountCents: 3000, daysAgo: 0 }),    // 40 days
    ];

    const result = detectRecurrence(txns);

    expect(result.isRecurring).toBe(false);
    expect(result.confidence).toBe("LOW");
  });

  it("two transactions with non-monthly interval and high CV", () => {
    const txns = [
      makeTxn({ merchantName: "Shop", amountCents: 1000, daysAgo: 10 }),
      makeTxn({ merchantName: "Shop", amountCents: 5000, daysAgo: 0 }), // 10-day interval
    ];

    const result = detectRecurrence(txns);

    expect(result.isRecurring).toBe(false);
    expect(result.confidence).toBe("LOW");
  });
});

// ---------------------------------------------------------------------------
// detectRecurrence — Edge Cases
// ---------------------------------------------------------------------------

describe("detectRecurrence — edge cases", () => {
  it("handles exactly 2 transactions at 30-day interval with same amount", () => {
    const txns = [
      makeTxn({ merchantName: "Netflix", amountCents: 1599, daysAgo: 30 }),
      makeTxn({ merchantName: "Netflix", amountCents: 1599, daysAgo: 0 }),
    ];

    const result = detectRecurrence(txns);

    expect(result.isRecurring).toBe(true);
    expect(result.confidence).toBe("HIGH");
  });

  it("handles transactions out of order (sorts internally)", () => {
    const txns = [
      makeTxn({ merchantName: "Hulu", amountCents: 1299, daysAgo: 0 }),
      makeTxn({ merchantName: "Hulu", amountCents: 1299, daysAgo: 60 }),
      makeTxn({ merchantName: "Hulu", amountCents: 1299, daysAgo: 30 }),
    ];

    const result = detectRecurrence(txns);

    expect(result.isRecurring).toBe(true);
    expect(result.confidence).toBe("HIGH");
  });

  it("uses merchantName for key even when displayName differs", () => {
    const txns = [
      makeTxn({ merchantName: "Netflix", displayName: "NFLX DIGITAL", amountCents: 1599, daysAgo: 30 }),
      makeTxn({ merchantName: "Netflix", displayName: "NETFLIX.COM", amountCents: 1599, daysAgo: 0 }),
    ];

    const result = detectRecurrence(txns);

    expect(result.merchantKey).toBe("netflix");
  });

  it("uses displayName for key when merchantName is null", () => {
    const txns = [
      makeTxn({ merchantName: null, displayName: "AUTOPAY MORTGAGE", amountCents: 140000, daysAgo: 30 }),
      makeTxn({ merchantName: null, displayName: "AUTOPAY MORTGAGE", amountCents: 140000, daysAgo: 0 }),
    ];

    const result = detectRecurrence(txns);

    expect(result.merchantKey).toBe("autopay mortgage");
    expect(result.isRecurring).toBe(true);
  });

  it("handles zero-amount transactions gracefully (CV = Infinity)", () => {
    const txns = [
      makeTxn({ merchantName: "Free Service", amountCents: 0, daysAgo: 30 }),
      makeTxn({ merchantName: "Free Service", amountCents: 0, daysAgo: 0 }),
    ];

    const result = detectRecurrence(txns);

    // CV is NaN (0/0), monthly cadence is there → MEDIUM at most
    // Actually 0/0 = NaN, which is not <= threshold, so monthly only → MEDIUM
    expect(result.isRecurring).toBe(true);
    expect(result.confidence).toBe("MEDIUM");
  });

  it("rounds avgAmountCents to integer", () => {
    const txns = [
      makeTxn({ merchantName: "Service", amountCents: 999, daysAgo: 30 }),
      makeTxn({ merchantName: "Service", amountCents: 1000, daysAgo: 0 }),
    ];

    const result = detectRecurrence(txns);

    // (999 + 1000) / 2 = 999.5 → rounds to 1000
    expect(result.avgAmountCents).toBe(1000);
  });

  it("boundary: CV exactly at 0.10 is HIGH (with monthly cadence)", () => {
    // Need mean and stddev such that stddev/mean = 0.10 exactly
    // mean = 10000, stddev = 1000
    // Two values: 10000+d and 10000-d where sqrt(d^2) = 1000 → d = 1000
    // Three values at 30-day intervals: 9000, 10000, 11000
    // mean = 10000, variance = ((−1000)^2 + 0 + 1000^2)/3 = 666666.67, stddev = 816.5
    // CV = 816.5/10000 = 0.082 → still HIGH
    // Need exact 0.10: mean=10000, variance=1000000, need sum((xi-mean)^2)/n = 1000000
    // Two values: a, b. mean=(a+b)/2. variance=((a-mean)^2+(b-mean)^2)/2 = ((a-b)/2)^2
    // So (a-b)/2 = 1000 → a-b = 2000. mean = 10000 → a=11000, b=9000.
    // CV = 1000/10000 = 0.10 exactly.
    const txns = [
      makeTxn({ merchantName: "Boundary", amountCents: 9000, daysAgo: 30 }),
      makeTxn({ merchantName: "Boundary", amountCents: 11000, daysAgo: 0 }),
    ];

    const result = detectRecurrence(txns);

    expect(result.isRecurring).toBe(true);
    expect(result.confidence).toBe("HIGH");
  });

  it("boundary: CV just above 0.10 with monthly cadence is MEDIUM", () => {
    // CV = 0.101 → needs stddev/mean > 0.10
    // mean = 10000, need stddev > 1000
    // Two values: diff > 2000. Use 8900, 11100 → mean=10000, diff=2200, stddev=1100, CV=0.11
    const txns = [
      makeTxn({ merchantName: "AboveBound", amountCents: 8900, daysAgo: 30 }),
      makeTxn({ merchantName: "AboveBound", amountCents: 11100, daysAgo: 0 }),
    ];

    const result = detectRecurrence(txns);

    expect(result.isRecurring).toBe(true);
    expect(result.confidence).toBe("MEDIUM");
  });

  it("boundary: CV just above 0.15 without monthly cadence is LOW", () => {
    // Non-monthly interval AND CV > 0.15
    // mean=10000, stddev > 1500 → CV > 0.15
    // Two values: 8000, 12000 → mean=10000, stddev=2000, CV=0.20
    const txns = [
      makeTxn({ merchantName: "HighVar", amountCents: 8000, daysAgo: 10 }),
      makeTxn({ merchantName: "HighVar", amountCents: 12000, daysAgo: 0 }),
    ];

    const result = detectRecurrence(txns);

    expect(result.isRecurring).toBe(false);
    expect(result.confidence).toBe("LOW");
  });
});

// ---------------------------------------------------------------------------
// detectRecurrence — Determinism
// ---------------------------------------------------------------------------

describe("detectRecurrence — determinism", () => {
  it("produces identical output for same input across multiple calls", () => {
    const txns = makeMonthlyMerchant({
      merchantName: "Netflix",
      amountCents: 1599,
      count: 3,
    });

    const result1 = detectRecurrence(txns);
    const result2 = detectRecurrence(txns);
    const result3 = detectRecurrence(txns);

    expect(result1).toEqual(result2);
    expect(result2).toEqual(result3);
  });

  it("produces identical output regardless of input order", () => {
    const txns = makeMonthlyMerchant({
      merchantName: "Spotify",
      amountCents: 999,
      count: 4,
    });

    const reversed = [...txns].reverse();
    const shuffled = [txns[2], txns[0], txns[3], txns[1]];

    const result1 = detectRecurrence(txns);
    const result2 = detectRecurrence(reversed);
    const result3 = detectRecurrence(shuffled);

    expect(result1).toEqual(result2);
    expect(result2).toEqual(result3);
  });
});

// ---------------------------------------------------------------------------
// detectRecurrenceForAll — batch detection
// ---------------------------------------------------------------------------

describe("detectRecurrenceForAll", () => {
  it("groups transactions by merchant and returns signals for each", () => {
    const txns = [
      ...makeMonthlyMerchant({ merchantName: "Netflix", amountCents: 1599, count: 3 }),
      ...makeMonthlyMerchant({ merchantName: "Spotify", amountCents: 999, count: 3 }),
      makeTxn({ merchantName: "Coffee Shop", amountCents: 500, daysAgo: 5 }),
    ];

    const results = detectRecurrenceForAll(txns);

    expect(results.size).toBe(3);
    expect(results.get("netflix")?.isRecurring).toBe(true);
    expect(results.get("spotify")?.isRecurring).toBe(true);
    expect(results.get("coffee shop")?.isRecurring).toBe(false);
  });

  it("handles empty array", () => {
    const results = detectRecurrenceForAll([]);
    expect(results.size).toBe(0);
  });

  it("groups case-insensitively", () => {
    const txns = [
      makeTxn({ merchantName: "Netflix", amountCents: 1599, daysAgo: 60 }),
      makeTxn({ merchantName: "NETFLIX", amountCents: 1599, daysAgo: 30 }),
      makeTxn({ merchantName: "netflix", amountCents: 1599, daysAgo: 0 }),
    ];

    const results = detectRecurrenceForAll(txns);

    expect(results.size).toBe(1);
    expect(results.has("netflix")).toBe(true);
    expect(results.get("netflix")?.transactionCount).toBe(3);
  });

  it("separates different merchants correctly", () => {
    const txns = [
      makeTxn({ merchantName: "Netflix", amountCents: 1599, daysAgo: 30 }),
      makeTxn({ merchantName: "Netflix", amountCents: 1599, daysAgo: 0 }),
      makeTxn({ merchantName: "Hulu", amountCents: 1299, daysAgo: 30 }),
      makeTxn({ merchantName: "Hulu", amountCents: 1299, daysAgo: 0 }),
    ];

    const results = detectRecurrenceForAll(txns);

    expect(results.size).toBe(2);
    expect(results.get("netflix")?.avgAmountCents).toBe(1599);
    expect(results.get("hulu")?.avgAmountCents).toBe(1299);
  });

  it("uses displayName for grouping when merchantName is null", () => {
    const txns = [
      makeTxn({ merchantName: null, displayName: "AUTOPAY RENT", amountCents: 150000, daysAgo: 30 }),
      makeTxn({ merchantName: null, displayName: "AUTOPAY RENT", amountCents: 150000, daysAgo: 0 }),
    ];

    const results = detectRecurrenceForAll(txns);

    expect(results.size).toBe(1);
    expect(results.has("autopay rent")).toBe(true);
    expect(results.get("autopay rent")?.isRecurring).toBe(true);
  });
});

// ===========================================================================
// classifyTransaction — per-transaction classification logic
// ===========================================================================

function makeSignal(overrides: Partial<RecurrenceSignal> = {}): RecurrenceSignal {
  return {
    merchantKey: "test",
    isRecurring: false,
    confidence: "LOW",
    avgAmountCents: 1000,
    transactionCount: 1,
    ...overrides,
  };
}

describe("classifyTransaction", () => {
  it("HOUSING → FIXED with HIGH confidence", () => {
    const result = classifyTransaction("FIXED", undefined);
    expect(result.expenseType).toBe("FIXED");
    expect(result.confidence).toBe("HIGH");
  });

  it("UTILITIES → FIXED with HIGH confidence", () => {
    const result = classifyTransaction("FIXED", makeSignal());
    expect(result.expenseType).toBe("FIXED");
    expect(result.confidence).toBe("HIGH");
  });

  it("SUBSCRIPTIONS → FIXED even without recurrence", () => {
    const result = classifyTransaction("FIXED", makeSignal({ isRecurring: false }));
    expect(result.expenseType).toBe("FIXED");
    expect(result.confidence).toBe("HIGH");
  });

  it("FOOD_AND_DRINK → FLEXIBLE when not recurring", () => {
    const result = classifyTransaction("FLEXIBLE", makeSignal({ isRecurring: false }));
    expect(result.expenseType).toBe("FLEXIBLE");
  });

  it("SHOPPING → FLEXIBLE when no recurrence signal", () => {
    const result = classifyTransaction("FLEXIBLE", undefined);
    expect(result.expenseType).toBe("FLEXIBLE");
    expect(result.confidence).toBe("MEDIUM");
  });

  it("recurring TRANSPORTATION → overridden to FIXED", () => {
    const result = classifyTransaction(
      "FLEXIBLE",
      makeSignal({ isRecurring: true, confidence: "HIGH" }),
    );
    expect(result.expenseType).toBe("FIXED");
    expect(result.confidence).toBe("HIGH");
  });

  it("recurring HEALTH (MEDIUM confidence) → FIXED with MEDIUM", () => {
    const result = classifyTransaction(
      "FLEXIBLE",
      makeSignal({ isRecurring: true, confidence: "MEDIUM" }),
    );
    expect(result.expenseType).toBe("FIXED");
    expect(result.confidence).toBe("MEDIUM");
  });

  it("non-recurring FLEXIBLE with LOW recurrence → HIGH confidence FLEXIBLE", () => {
    const result = classifyTransaction(
      "FLEXIBLE",
      makeSignal({ isRecurring: false, confidence: "LOW" }),
    );
    expect(result.expenseType).toBe("FLEXIBLE");
    expect(result.confidence).toBe("HIGH");
  });
});

// ===========================================================================
// CATEGORY_DEFAULT_TYPE — mapping completeness
// ===========================================================================

describe("CATEGORY_DEFAULT_TYPE", () => {
  it("maps HOUSING to FIXED", () => {
    expect(CATEGORY_DEFAULT_TYPE.HOUSING).toBe("FIXED");
  });

  it("maps UTILITIES to FIXED", () => {
    expect(CATEGORY_DEFAULT_TYPE.UTILITIES).toBe("FIXED");
  });

  it("maps SUBSCRIPTIONS to FIXED", () => {
    expect(CATEGORY_DEFAULT_TYPE.SUBSCRIPTIONS).toBe("FIXED");
  });

  it("maps FOOD_AND_DRINK to FLEXIBLE", () => {
    expect(CATEGORY_DEFAULT_TYPE.FOOD_AND_DRINK).toBe("FLEXIBLE");
  });

  it("maps SHOPPING to FLEXIBLE", () => {
    expect(CATEGORY_DEFAULT_TYPE.SHOPPING).toBe("FLEXIBLE");
  });

  it("maps ENTERTAINMENT to FLEXIBLE", () => {
    expect(CATEGORY_DEFAULT_TYPE.ENTERTAINMENT).toBe("FLEXIBLE");
  });

  it("maps HEALTH to FLEXIBLE", () => {
    expect(CATEGORY_DEFAULT_TYPE.HEALTH).toBe("FLEXIBLE");
  });

  it("maps PERSONAL to FLEXIBLE", () => {
    expect(CATEGORY_DEFAULT_TYPE.PERSONAL).toBe("FLEXIBLE");
  });

  it("maps UNCATEGORIZED to FLEXIBLE", () => {
    expect(CATEGORY_DEFAULT_TYPE.UNCATEGORIZED).toBe("FLEXIBLE");
  });

  it("maps INCOME to FLEXIBLE (filtered before use)", () => {
    expect(CATEGORY_DEFAULT_TYPE.INCOME).toBe("FLEXIBLE");
  });

  it("maps TRANSFER to FLEXIBLE (filtered before use)", () => {
    expect(CATEGORY_DEFAULT_TYPE.TRANSFER).toBe("FLEXIBLE");
  });
});

// ===========================================================================
// CATEGORY_LABELS — display name mapping
// ===========================================================================

describe("CATEGORY_LABELS", () => {
  it("has a label for every expense category", () => {
    const expectedCategories = [
      "HOUSING", "UTILITIES", "SUBSCRIPTIONS", "TRANSPORTATION",
      "FOOD_AND_DRINK", "SHOPPING", "ENTERTAINMENT", "HEALTH",
      "PERSONAL", "UNCATEGORIZED",
    ];
    for (const cat of expectedCategories) {
      expect(CATEGORY_LABELS[cat]).toBeDefined();
    }
  });

  it("maps UNCATEGORIZED to 'Other'", () => {
    expect(CATEGORY_LABELS.UNCATEGORIZED).toBe("Other");
  });

  it("maps FOOD_AND_DRINK to 'Food & Drink'", () => {
    expect(CATEGORY_LABELS.FOOD_AND_DRINK).toBe("Food & Drink");
  });
});

// ===========================================================================
// computeExpenseClassification — full pipeline with mocked DB
// ===========================================================================

interface MockExpenseTxn {
  id: string;
  amountCents: number;
  date: Date;
  category: string;
  merchantName: string | null;
  displayName: string;
  financialAccountId: string;
}

function makeExpenseTxn(overrides: Partial<MockExpenseTxn> & { daysAgo?: number } = {}): MockExpenseTxn {
  txnCounter++;
  return {
    id: overrides.id ?? `exp-${txnCounter}`,
    amountCents: overrides.amountCents ?? 5000,
    date: overrides.daysAgo !== undefined ? makeDate(overrides.daysAgo) : makeDate(0),
    category: overrides.category ?? "FOOD_AND_DRINK",
    merchantName: "merchantName" in overrides ? (overrides.merchantName ?? null) : "Test Merchant",
    displayName: overrides.displayName ?? "TEST MERCHANT",
    financialAccountId: overrides.financialAccountId ?? "acc-1",
  };
}

interface MockIncomeRow {
  id: string;
  amountCents: number;
  date: Date;
  displayName: string;
  financialAccountId: string;
  transactionType: string;
}

function makeMockClassificationClient(
  transactions: MockExpenseTxn[] = [],
  incomeTxns: MockIncomeRow[] = [],
) {
  const upsertedRecords: unknown[] = [];
  const updateManyCalls: unknown[] = [];

  // Sort by date ascending to match real DB orderBy: { date: "asc" }
  const sorted = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());

  // First findMany call returns expense txns, second returns income txns for reciprocal detection
  const findManyFn = vi.fn()
    .mockResolvedValueOnce(sorted)
    .mockResolvedValueOnce(incomeTxns);

  return {
    client: {
      normalizedTransaction: {
        findMany: findManyFn,
        updateMany: vi.fn().mockImplementation((args: unknown) => {
          updateManyCalls.push(args);
          return Promise.resolve({ count: 1 });
        }),
      },
      expenseClassification: {
        upsert: vi.fn().mockImplementation((args: { create: unknown }) => {
          upsertedRecords.push(args.create);
          return Promise.resolve(args.create);
        }),
      },
    },
    upsertedRecords,
    updateManyCalls,
  };
}

describe("computeExpenseClassification — happy path", () => {
  beforeEach(() => {
    txnCounter = 0;
  });

  it("classifies HOUSING as FIXED", async () => {
    const txns = [
      makeExpenseTxn({ category: "HOUSING", amountCents: 140000, daysAgo: 60, merchantName: "Landlord" }),
      makeExpenseTxn({ category: "HOUSING", amountCents: 140000, daysAgo: 30, merchantName: "Landlord" }),
      makeExpenseTxn({ category: "HOUSING", amountCents: 140000, daysAgo: 0, merchantName: "Landlord" }),
    ];

    const { client, upsertedRecords } = makeMockClassificationClient(txns);
    await computeExpenseClassification("user-1", client as any);

    const record = upsertedRecords[0] as any;
    expect(record.status).toBe("READY");
    expect(record.fixedPct).toBe(100);
    expect(record.flexiblePct).toBe(0);
    expect(record.fixedCents).toBeGreaterThan(0);
    expect(record.flexibleCents).toBe(0);
  });

  it("classifies FOOD_AND_DRINK as FLEXIBLE when not recurring", async () => {
    const txns = [
      makeExpenseTxn({ category: "FOOD_AND_DRINK", amountCents: 2500, daysAgo: 60, merchantName: "Cafe A" }),
      makeExpenseTxn({ category: "FOOD_AND_DRINK", amountCents: 3500, daysAgo: 40, merchantName: "Cafe B" }),
      makeExpenseTxn({ category: "FOOD_AND_DRINK", amountCents: 4000, daysAgo: 10, merchantName: "Cafe C" }),
      makeExpenseTxn({ category: "FOOD_AND_DRINK", amountCents: 1500, daysAgo: 0, merchantName: "Cafe D" }),
    ];

    const { client, upsertedRecords } = makeMockClassificationClient(txns);
    await computeExpenseClassification("user-1", client as any);

    const record = upsertedRecords[0] as any;
    expect(record.fixedPct).toBe(0);
    expect(record.flexiblePct).toBe(100);
  });

  it("overrides recurring TRANSPORTATION to FIXED", async () => {
    // 3 monthly transit pass charges + one-off shopping
    const txns = [
      makeExpenseTxn({ category: "TRANSPORTATION", amountCents: 12700, daysAgo: 60, merchantName: "Transit" }),
      makeExpenseTxn({ category: "TRANSPORTATION", amountCents: 12700, daysAgo: 30, merchantName: "Transit" }),
      makeExpenseTxn({ category: "TRANSPORTATION", amountCents: 12700, daysAgo: 0, merchantName: "Transit" }),
      makeExpenseTxn({ category: "SHOPPING", amountCents: 5000, daysAgo: 45, merchantName: "Store" }),
    ];

    const { client, upsertedRecords } = makeMockClassificationClient(txns);
    await computeExpenseClassification("user-1", client as any);

    const record = upsertedRecords[0] as any;
    // Transit is recurring → FIXED. Shopping is one-off → FLEXIBLE.
    expect(record.fixedCents).toBeGreaterThan(0);
    expect(record.flexibleCents).toBeGreaterThan(0);
    expect(record.fixedPct + record.flexiblePct).toBe(100);
  });

  it("percentages always sum to 100", async () => {
    const txns = [
      makeExpenseTxn({ category: "HOUSING", amountCents: 140000, daysAgo: 60, merchantName: "Rent" }),
      makeExpenseTxn({ category: "HOUSING", amountCents: 140000, daysAgo: 30, merchantName: "Rent" }),
      makeExpenseTxn({ category: "HOUSING", amountCents: 140000, daysAgo: 0, merchantName: "Rent" }),
      makeExpenseTxn({ category: "FOOD_AND_DRINK", amountCents: 3333, daysAgo: 50, merchantName: "Cafe" }),
      makeExpenseTxn({ category: "FOOD_AND_DRINK", amountCents: 3333, daysAgo: 20, merchantName: "Diner" }),
      makeExpenseTxn({ category: "ENTERTAINMENT", amountCents: 1599, daysAgo: 10, merchantName: "Movie" }),
    ];

    const { client, upsertedRecords } = makeMockClassificationClient(txns);
    await computeExpenseClassification("user-1", client as any);

    const record = upsertedRecords[0] as any;
    expect(record.fixedPct + record.flexiblePct).toBe(100);
  });

  it("all financial values are integers", async () => {
    const txns = [
      makeExpenseTxn({ category: "HOUSING", amountCents: 133333, daysAgo: 60, merchantName: "Rent" }),
      makeExpenseTxn({ category: "HOUSING", amountCents: 133333, daysAgo: 30, merchantName: "Rent" }),
      makeExpenseTxn({ category: "HOUSING", amountCents: 133333, daysAgo: 0, merchantName: "Rent" }),
      makeExpenseTxn({ category: "SHOPPING", amountCents: 7777, daysAgo: 45, merchantName: "Shop" }),
    ];

    const { client, upsertedRecords } = makeMockClassificationClient(txns);
    await computeExpenseClassification("user-1", client as any);

    const record = upsertedRecords[0] as any;
    expect(Number.isInteger(record.fixedCents)).toBe(true);
    expect(Number.isInteger(record.flexibleCents)).toBe(true);
    expect(Number.isInteger(record.fixedPct)).toBe(true);
    expect(Number.isInteger(record.flexiblePct)).toBe(true);
  });

  it("categories sorted descending by amount", async () => {
    const txns = [
      makeExpenseTxn({ category: "HOUSING", amountCents: 140000, daysAgo: 60, merchantName: "Rent" }),
      makeExpenseTxn({ category: "HOUSING", amountCents: 140000, daysAgo: 30, merchantName: "Rent" }),
      makeExpenseTxn({ category: "HOUSING", amountCents: 140000, daysAgo: 0, merchantName: "Rent" }),
      makeExpenseTxn({ category: "UTILITIES", amountCents: 8000, daysAgo: 50, merchantName: "Electric" }),
      makeExpenseTxn({ category: "UTILITIES", amountCents: 8000, daysAgo: 20, merchantName: "Electric" }),
      makeExpenseTxn({ category: "SUBSCRIPTIONS", amountCents: 1599, daysAgo: 10, merchantName: "Netflix" }),
    ];

    const { client, upsertedRecords } = makeMockClassificationClient(txns);
    await computeExpenseClassification("user-1", client as any);

    const record = upsertedRecords[0] as any;
    const fixedCats = record.fixedCategories as Array<{ amountCents: number }>;
    for (let i = 1; i < fixedCats.length; i++) {
      expect(fixedCats[i - 1].amountCents).toBeGreaterThanOrEqual(fixedCats[i].amountCents);
    }
  });

  it("category breakdowns have correct labels", async () => {
    const txns = [
      makeExpenseTxn({ category: "HOUSING", amountCents: 140000, daysAgo: 60, merchantName: "Rent" }),
      makeExpenseTxn({ category: "HOUSING", amountCents: 140000, daysAgo: 30, merchantName: "Rent" }),
      makeExpenseTxn({ category: "HOUSING", amountCents: 140000, daysAgo: 0, merchantName: "Rent" }),
    ];

    const { client, upsertedRecords } = makeMockClassificationClient(txns);
    await computeExpenseClassification("user-1", client as any);

    const record = upsertedRecords[0] as any;
    const fixedCats = record.fixedCategories as Array<{ category: string; label: string }>;
    const housingCat = fixedCats.find((c) => c.category === "HOUSING");
    expect(housingCat?.label).toBe("Housing");
  });
});

describe("computeExpenseClassification — edge cases", () => {
  beforeEach(() => {
    txnCounter = 0;
  });

  it("returns INSUFFICIENT_DATA when no transactions", async () => {
    const { client, upsertedRecords } = makeMockClassificationClient([]);
    await computeExpenseClassification("user-1", client as any);

    const record = upsertedRecords[0] as any;
    expect(record.status).toBe("INSUFFICIENT_DATA");
    expect(record.fixedCents).toBe(0);
    expect(record.flexibleCents).toBe(0);
    expect(record.transactionCount).toBe(0);
  });

  it("returns INSUFFICIENT_DATA when day span < 30", async () => {
    const txns = [
      makeExpenseTxn({ category: "FOOD_AND_DRINK", amountCents: 2500, daysAgo: 20 }),
      makeExpenseTxn({ category: "FOOD_AND_DRINK", amountCents: 3500, daysAgo: 0 }),
    ];

    const { client, upsertedRecords } = makeMockClassificationClient(txns);
    await computeExpenseClassification("user-1", client as any);

    const record = upsertedRecords[0] as any;
    expect(record.status).toBe("INSUFFICIENT_DATA");
  });

  it("all spending fixed → fixedPct=100, flexiblePct=0", async () => {
    const txns = [
      makeExpenseTxn({ category: "HOUSING", amountCents: 140000, daysAgo: 60, merchantName: "Rent" }),
      makeExpenseTxn({ category: "HOUSING", amountCents: 140000, daysAgo: 30, merchantName: "Rent" }),
      makeExpenseTxn({ category: "HOUSING", amountCents: 140000, daysAgo: 0, merchantName: "Rent" }),
    ];

    const { client, upsertedRecords } = makeMockClassificationClient(txns);
    await computeExpenseClassification("user-1", client as any);

    const record = upsertedRecords[0] as any;
    expect(record.fixedPct).toBe(100);
    expect(record.flexiblePct).toBe(0);
  });

  it("all spending flexible → fixedPct=0, flexiblePct=100", async () => {
    const txns = [
      makeExpenseTxn({ category: "SHOPPING", amountCents: 5000, daysAgo: 60, merchantName: "Store A" }),
      makeExpenseTxn({ category: "ENTERTAINMENT", amountCents: 3000, daysAgo: 30, merchantName: "Movie" }),
      makeExpenseTxn({ category: "FOOD_AND_DRINK", amountCents: 2000, daysAgo: 0, merchantName: "Cafe" }),
    ];

    const { client, upsertedRecords } = makeMockClassificationClient(txns);
    await computeExpenseClassification("user-1", client as any);

    const record = upsertedRecords[0] as any;
    expect(record.fixedPct).toBe(0);
    expect(record.flexiblePct).toBe(100);
  });

  it("batch-updates transactions by (expenseType, confidence) group", async () => {
    const txns = [
      makeExpenseTxn({ category: "HOUSING", amountCents: 140000, daysAgo: 60, merchantName: "Rent" }),
      makeExpenseTxn({ category: "HOUSING", amountCents: 140000, daysAgo: 30, merchantName: "Rent" }),
      makeExpenseTxn({ category: "HOUSING", amountCents: 140000, daysAgo: 0, merchantName: "Rent" }),
      makeExpenseTxn({ category: "SHOPPING", amountCents: 5000, daysAgo: 45, merchantName: "Store" }),
    ];

    const { client, updateManyCalls } = makeMockClassificationClient(txns);
    await computeExpenseClassification("user-1", client as any);

    // Should have batch updates, not one per transaction
    expect(updateManyCalls.length).toBeGreaterThan(0);
    expect(updateManyCalls.length).toBeLessThanOrEqual(txns.length);
  });

  it("handles mixed fixed and flexible categories correctly", async () => {
    // 61-day window (daysAgo 60 to 0)
    const txns = [
      // FIXED: Housing $1400 * 3 = $4200 raw over 61 days
      makeExpenseTxn({ category: "HOUSING", amountCents: 140000, daysAgo: 60, merchantName: "Rent" }),
      makeExpenseTxn({ category: "HOUSING", amountCents: 140000, daysAgo: 30, merchantName: "Rent" }),
      makeExpenseTxn({ category: "HOUSING", amountCents: 140000, daysAgo: 0, merchantName: "Rent" }),
      // FIXED: Utilities $80 * 2 = $160 raw
      makeExpenseTxn({ category: "UTILITIES", amountCents: 8000, daysAgo: 50, merchantName: "Electric" }),
      makeExpenseTxn({ category: "UTILITIES", amountCents: 8000, daysAgo: 20, merchantName: "Electric" }),
      // FLEXIBLE: Food $50 one-off
      makeExpenseTxn({ category: "FOOD_AND_DRINK", amountCents: 5000, daysAgo: 40, merchantName: "Cafe" }),
      // FLEXIBLE: Shopping $100 one-off
      makeExpenseTxn({ category: "SHOPPING", amountCents: 10000, daysAgo: 10, merchantName: "Store" }),
    ];

    const { client, upsertedRecords } = makeMockClassificationClient(txns);
    await computeExpenseClassification("user-1", client as any);

    const record = upsertedRecords[0] as any;
    expect(record.status).toBe("READY");
    expect(record.fixedCents).toBeGreaterThan(record.flexibleCents);
    expect(record.fixedPct + record.flexiblePct).toBe(100);
    expect(record.transactionCount).toBe(7);

    // Category breakdowns
    const fixedCats = record.fixedCategories as Array<{ category: string; amountCents: number }>;
    const flexCats = record.flexibleCategories as Array<{ category: string; amountCents: number }>;

    expect(fixedCats.length).toBe(2); // HOUSING, UTILITIES
    expect(flexCats.length).toBe(2); // FOOD_AND_DRINK, SHOPPING

    // Housing should be first (largest)
    expect(fixedCats[0].category).toBe("HOUSING");
  });

  it("monthly scaling uses same approach as baseline (raw / windowDays * 30.44)", async () => {
    // 61-day window: 3 housing charges of $1400
    // Raw fixed: 420000 cents. Monthly: round(420000 / 61 * 30.44) = round(209,544.26...) = 209544
    const txns = [
      makeExpenseTxn({ category: "HOUSING", amountCents: 140000, daysAgo: 60, merchantName: "Rent" }),
      makeExpenseTxn({ category: "HOUSING", amountCents: 140000, daysAgo: 30, merchantName: "Rent" }),
      makeExpenseTxn({ category: "HOUSING", amountCents: 140000, daysAgo: 0, merchantName: "Rent" }),
    ];

    const { client, upsertedRecords } = makeMockClassificationClient(txns);
    await computeExpenseClassification("user-1", client as any);

    const record = upsertedRecords[0] as any;
    // actualWindowDays = 60 + 1 = 61
    const expected = Math.round((420000 / 61) * 30.44);
    expect(record.fixedCents).toBe(expected);
  });
});

describe("computeExpenseClassification — determinism", () => {
  beforeEach(() => {
    txnCounter = 0;
  });

  it("same transactions produce same output", async () => {
    const baseTxns = [
      makeExpenseTxn({ id: "d1", category: "HOUSING", amountCents: 140000, daysAgo: 60, merchantName: "Rent" }),
      makeExpenseTxn({ id: "d2", category: "HOUSING", amountCents: 140000, daysAgo: 30, merchantName: "Rent" }),
      makeExpenseTxn({ id: "d3", category: "HOUSING", amountCents: 140000, daysAgo: 0, merchantName: "Rent" }),
      makeExpenseTxn({ id: "d4", category: "FOOD_AND_DRINK", amountCents: 5000, daysAgo: 45, merchantName: "Cafe" }),
    ];

    const mock1 = makeMockClassificationClient([...baseTxns]);
    const mock2 = makeMockClassificationClient([...baseTxns]);

    await computeExpenseClassification("user-1", mock1.client as any);
    await computeExpenseClassification("user-1", mock2.client as any);

    const r1 = mock1.upsertedRecords[0] as any;
    const r2 = mock2.upsertedRecords[0] as any;

    expect(r1.fixedCents).toBe(r2.fixedCents);
    expect(r1.flexibleCents).toBe(r2.flexibleCents);
    expect(r1.fixedPct).toBe(r2.fixedPct);
    expect(r1.flexiblePct).toBe(r2.flexiblePct);
  });
});

// ===========================================================================
// computeExpenseClassification — transfer filtering
// ===========================================================================

describe("computeExpenseClassification — transfer filtering", () => {
  beforeEach(() => {
    txnCounter = 0;
  });

  it("filters out transactions with transfer-like display names", async () => {
    const txns = [
      makeExpenseTxn({ category: "UNCATEGORIZED", amountCents: 50000, daysAgo: 60, displayName: "Online Transfer to Savings", merchantName: null }),
      makeExpenseTxn({ category: "UNCATEGORIZED", amountCents: 30000, daysAgo: 45, displayName: "ACH Transfer", merchantName: null }),
      makeExpenseTxn({ category: "FOOD_AND_DRINK", amountCents: 2500, daysAgo: 30, merchantName: "Cafe", displayName: "CAFE PURCHASE" }),
      makeExpenseTxn({ category: "FOOD_AND_DRINK", amountCents: 3500, daysAgo: 0, merchantName: "Diner", displayName: "DINER PURCHASE" }),
    ];

    const { client, upsertedRecords } = makeMockClassificationClient(txns);
    await computeExpenseClassification("user-1", client as any);

    const record = upsertedRecords[0] as any;
    // Transfer txns should be filtered out — only the 2 food txns remain
    // But day span for 2 remaining txns is only 30, which is >= MIN_DAY_SPAN
    expect(record.status).toBe("READY");
    expect(record.transactionCount).toBe(2);
  });

  it("filters out reciprocal transfers (same-day matching debit/credit across accounts)", async () => {
    const txns = [
      makeExpenseTxn({ category: "HOUSING", amountCents: 140000, daysAgo: 60, merchantName: "Rent", financialAccountId: "acc-1" }),
      makeExpenseTxn({ category: "HOUSING", amountCents: 140000, daysAgo: 30, merchantName: "Rent", financialAccountId: "acc-1" }),
      makeExpenseTxn({ category: "HOUSING", amountCents: 140000, daysAgo: 0, merchantName: "Rent", financialAccountId: "acc-1" }),
      // This expense matches a same-day income on a different account
      makeExpenseTxn({ id: "reciprocal-exp", category: "UNCATEGORIZED", amountCents: 100000, daysAgo: 45, merchantName: null, displayName: "Move Funds", financialAccountId: "acc-1" }),
    ];

    const incomeTxns: MockIncomeRow[] = [
      {
        id: "reciprocal-inc",
        amountCents: -100000, // income amounts are negative in Plaid
        date: makeDate(45),
        displayName: "Move Funds",
        financialAccountId: "acc-2",
        transactionType: "INCOME",
      },
    ];

    const { client, upsertedRecords } = makeMockClassificationClient(txns, incomeTxns);
    await computeExpenseClassification("user-1", client as any);

    const record = upsertedRecords[0] as any;
    // The "Move Funds" expense should be filtered — first by name pattern, leaving 3 rent txns
    expect(record.status).toBe("READY");
    expect(record.transactionCount).toBe(3);
  });
});

// ===========================================================================
// computeExpenseClassification — stale label cleanup
// ===========================================================================

describe("computeExpenseClassification — stale label cleanup", () => {
  beforeEach(() => {
    txnCounter = 0;
  });

  it("clears stale expenseType on previously-classified transactions not in current set", async () => {
    const txns = [
      makeExpenseTxn({ id: "t1", category: "HOUSING", amountCents: 140000, daysAgo: 60, merchantName: "Rent" }),
      makeExpenseTxn({ id: "t2", category: "HOUSING", amountCents: 140000, daysAgo: 30, merchantName: "Rent" }),
      makeExpenseTxn({ id: "t3", category: "HOUSING", amountCents: 140000, daysAgo: 0, merchantName: "Rent" }),
    ];

    const { client, updateManyCalls } = makeMockClassificationClient(txns);
    await computeExpenseClassification("user-1", client as any);

    // First updateMany should be the stale label cleanup (notIn classified IDs)
    const staleCleanup = (updateManyCalls as any[]).find(
      (call: any) => call.data?.expenseType === null,
    );
    expect(staleCleanup).toBeDefined();
    expect(staleCleanup.where.userId).toBe("user-1");
    expect(staleCleanup.where.expenseType).toEqual({ not: null });
    expect(staleCleanup.where.id.notIn).toEqual(expect.arrayContaining(["t1", "t2", "t3"]));
    expect(staleCleanup.data.classificationConfidence).toBeNull();
  });
});
