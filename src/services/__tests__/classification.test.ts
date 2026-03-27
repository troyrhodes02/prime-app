import { describe, it, expect } from "vitest";
import {
  detectRecurrence,
  detectRecurrenceForAll,
  normalizeMerchantKey,
  type TransactionInput,
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

  it("consistent amounts (CV ≤ 0.15) but irregular cadence", () => {
    // Very consistent amounts but intervals outside 25-35 range
    const txns = [
      makeTxn({ merchantName: "Subscription", amountCents: 2999, daysAgo: 80 }),
      makeTxn({ merchantName: "Subscription", amountCents: 3000, daysAgo: 40 }), // 40-day interval
      makeTxn({ merchantName: "Subscription", amountCents: 3001, daysAgo: 0 }),  // 40-day interval
    ];

    const result = detectRecurrence(txns);

    // CV is very low (< 0.01) so should be MEDIUM even without monthly cadence
    expect(result.isRecurring).toBe(true);
    expect(result.confidence).toBe("MEDIUM");
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
