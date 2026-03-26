import { describe, it, expect, vi, beforeEach } from "vitest";
import { computeBaseline } from "../baseline";

function makeDate(daysAgo: number): Date {
  return new Date(Date.UTC(2026, 2, 25 - daysAgo));
}

function makeTxn(overrides: Partial<{
  id: string;
  amountCents: number;
  date: Date;
  transactionType: "INCOME" | "EXPENSE";
  category: string;
  displayName: string;
  financialAccountId: string;
}> = {}) {
  return {
    id: overrides.id ?? `txn-${Math.random().toString(36).slice(2, 8)}`,
    amountCents: overrides.amountCents ?? 1000,
    date: overrides.date ?? makeDate(45),
    transactionType: overrides.transactionType ?? "EXPENSE",
    category: overrides.category ?? "FOOD_AND_DRINK",
    displayName: overrides.displayName ?? "Grocery Store",
    financialAccountId: overrides.financialAccountId ?? "acc-1",
  };
}

function makeMockClient(transactions: ReturnType<typeof makeTxn>[] = []) {
  const upsertedRecords: unknown[] = [];

  return {
    client: {
      normalizedTransaction: {
        findMany: vi.fn().mockResolvedValue(transactions),
      },
      financialBaseline: {
        upsert: vi.fn().mockImplementation((args: { create: unknown }) => {
          upsertedRecords.push(args.create);
          return Promise.resolve(args.create);
        }),
      },
    },
    upsertedRecords,
  };
}

// ---------------------------------------------------------------------------
// Happy Path
// ---------------------------------------------------------------------------

describe("computeBaseline — happy path", () => {
  it("computes correct monthlyIncomeCents, monthlySpendingCents, availableCents", async () => {
    // 60-day window: daily $50 expense + 2 paychecks of $3000
    const txns = [];

    // 60 days of $50 expenses
    for (let i = 0; i <= 60; i++) {
      txns.push(makeTxn({
        amountCents: 5000,
        date: makeDate(i),
        transactionType: "EXPENSE",
      }));
    }

    // 2 paychecks (income is negative in Plaid convention)
    txns.push(makeTxn({
      amountCents: -300000,
      date: makeDate(45),
      transactionType: "INCOME",
      displayName: "Payroll Deposit",
    }));
    txns.push(makeTxn({
      amountCents: -300000,
      date: makeDate(15),
      transactionType: "INCOME",
      displayName: "Payroll Deposit",
    }));

    // Sort ascending by date (as DB would return)
    txns.sort((a, b) => a.date.getTime() - b.date.getTime());

    const { client } = makeMockClient(txns);
    const result = await computeBaseline("user-1", client as any);

    expect(result).toHaveProperty("status", "READY");
    expect(result).toHaveProperty("monthlyIncomeCents");
    expect(result).toHaveProperty("monthlySpendingCents");
    expect(result).toHaveProperty("availableCents");

    // availableCents must equal income - spending
    const r = result as any;
    expect(r.availableCents).toBe(r.monthlyIncomeCents - r.monthlySpendingCents);

    // All values must be integers
    expect(Number.isInteger(r.monthlyIncomeCents)).toBe(true);
    expect(Number.isInteger(r.monthlySpendingCents)).toBe(true);
    expect(Number.isInteger(r.availableCents)).toBe(true);

    // Income: 600000 cents total over 61 days, normalized to monthly
    // = round((600000 / 61) * 30.44)
    const expectedIncome = Math.round((600000 / 61) * 30.44);
    expect(r.monthlyIncomeCents).toBe(expectedIncome);
  });
});

// ---------------------------------------------------------------------------
// Transfer Exclusion
// ---------------------------------------------------------------------------

describe("computeBaseline — transfer exclusion", () => {
  it("excludes transactions with TRANSFER category", async () => {
    const txns = [];
    // 40 days of regular expenses
    for (let i = 0; i <= 40; i++) {
      txns.push(makeTxn({
        amountCents: 2000,
        date: makeDate(i),
        transactionType: "EXPENSE",
      }));
    }
    // A transfer that should be excluded
    txns.push(makeTxn({
      amountCents: 100000,
      date: makeDate(20),
      transactionType: "EXPENSE",
      category: "TRANSFER",
      displayName: "Savings Transfer",
    }));
    // An income that looks like a transfer category
    txns.push(makeTxn({
      amountCents: -100000,
      date: makeDate(20),
      transactionType: "INCOME",
      category: "TRANSFER",
      displayName: "Checking Transfer",
    }));

    txns.sort((a, b) => a.date.getTime() - b.date.getTime());
    const { client } = makeMockClient(txns);
    const result = await computeBaseline("user-1", client as any) as any;

    // Income should be 0 since the only income txn is a TRANSFER
    expect(result.monthlyIncomeCents).toBe(0);
    expect(result.status).toBe("READY");
  });

  it("excludes transactions matching transfer name patterns", async () => {
    const txns = [];
    for (let i = 0; i <= 40; i++) {
      txns.push(makeTxn({
        amountCents: 2000,
        date: makeDate(i),
        transactionType: "EXPENSE",
      }));
    }
    // Name-based transfers
    txns.push(makeTxn({
      amountCents: -500000,
      date: makeDate(15),
      transactionType: "INCOME",
      displayName: "Online Transfer From Savings",
    }));
    txns.push(makeTxn({
      amountCents: -200000,
      date: makeDate(10),
      transactionType: "INCOME",
      displayName: "ACH Transfer",
    }));
    txns.push(makeTxn({
      amountCents: 50000,
      date: makeDate(5),
      transactionType: "EXPENSE",
      displayName: "Xfer to checking",
    }));

    txns.sort((a, b) => a.date.getTime() - b.date.getTime());
    const { client } = makeMockClient(txns);
    const result = await computeBaseline("user-1", client as any) as any;

    // All income was name-matched transfers, so income = 0
    expect(result.monthlyIncomeCents).toBe(0);
  });

  it("excludes reciprocal transfers (same day, same amount, different accounts)", async () => {
    const txns = [];
    for (let i = 0; i <= 40; i++) {
      txns.push(makeTxn({
        amountCents: 2000,
        date: makeDate(i),
        transactionType: "EXPENSE",
      }));
    }
    // Real paycheck
    txns.push(makeTxn({
      id: "real-pay",
      amountCents: -500000,
      date: makeDate(30),
      transactionType: "INCOME",
      displayName: "Payroll",
      financialAccountId: "acc-1",
    }));
    // Reciprocal transfer pair: $1000 moved between accounts on same day
    txns.push(makeTxn({
      id: "xfer-out",
      amountCents: 100000,
      date: makeDate(20),
      transactionType: "EXPENSE",
      displayName: "Checking Withdrawal",
      financialAccountId: "acc-1",
    }));
    txns.push(makeTxn({
      id: "xfer-in",
      amountCents: -100000,
      date: makeDate(20),
      transactionType: "INCOME",
      displayName: "Savings Deposit",
      financialAccountId: "acc-2",
    }));

    txns.sort((a, b) => a.date.getTime() - b.date.getTime());
    const { client } = makeMockClient(txns);
    const result = await computeBaseline("user-1", client as any) as any;

    // Income should only include the real paycheck, not the reciprocal transfer
    // $5000 / 41 days * 30.44
    const expectedIncome = Math.round((500000 / 41) * 30.44);
    expect(result.monthlyIncomeCents).toBe(expectedIncome);
  });
});

// ---------------------------------------------------------------------------
// Spending Smoothing (Trimmed Mean)
// ---------------------------------------------------------------------------

describe("computeBaseline — spending smoothing", () => {
  it("trimmed mean removes top 5% outlier spike days", async () => {
    const txns = [];
    // 40 days of $20 expenses
    for (let i = 0; i <= 40; i++) {
      txns.push(makeTxn({
        amountCents: 2000,
        date: makeDate(i),
        transactionType: "EXPENSE",
      }));
    }
    // One massive outlier day
    txns.push(makeTxn({
      amountCents: 500000,
      date: makeDate(20),
      transactionType: "EXPENSE",
      displayName: "Emergency Repair",
    }));

    txns.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Compute WITH the outlier (should be trimmed)
    const { client } = makeMockClient(txns);
    const result = await computeBaseline("user-1", client as any) as any;

    // Without trimming, spending would be much higher due to $5000 day
    // With trimming, the top 5% (which includes that spike) is removed
    // The result should be closer to $20/day * 30.44
    const naiveMonthly = Math.round(((2000 * 41 + 500000) / 41) * 30.44);
    expect(result.monthlySpendingCents).toBeLessThan(naiveMonthly);
    expect(result.status).toBe("READY");
  });

  it("falls back to simple mean with < 14 spending days", async () => {
    const txns = [];
    // Only 10 days with spending, spread across 35 day window
    for (let i = 0; i < 10; i++) {
      txns.push(makeTxn({
        amountCents: 3000,
        date: makeDate(i * 4), // spread out
        transactionType: "EXPENSE",
      }));
    }
    // Ensure 35+ day span
    txns.push(makeTxn({
      amountCents: 3000,
      date: makeDate(0),
      transactionType: "EXPENSE",
    }));
    txns.push(makeTxn({
      amountCents: 3000,
      date: makeDate(36),
      transactionType: "EXPENSE",
    }));

    txns.sort((a, b) => a.date.getTime() - b.date.getTime());
    const { client } = makeMockClient(txns);
    const result = await computeBaseline("user-1", client as any) as any;

    expect(result.status).toBe("READY");
    expect(Number.isInteger(result.monthlySpendingCents)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Insufficient Data
// ---------------------------------------------------------------------------

describe("computeBaseline — insufficient data", () => {
  it("returns INSUFFICIENT_DATA when < 30 days of history", async () => {
    const txns = [];
    for (let i = 0; i <= 20; i++) {
      txns.push(makeTxn({
        amountCents: 2000,
        date: makeDate(i),
        transactionType: "EXPENSE",
      }));
    }
    txns.sort((a, b) => a.date.getTime() - b.date.getTime());

    const { client } = makeMockClient(txns);
    const result = await computeBaseline("user-1", client as any) as any;

    expect(result.status).toBe("INSUFFICIENT_DATA");
    expect(result.monthlyIncomeCents).toBe(0);
    expect(result.monthlySpendingCents).toBe(0);
    expect(result.availableCents).toBe(0);
  });

  it("returns INSUFFICIENT_DATA with zeros when no transactions", async () => {
    const { client } = makeMockClient([]);
    const result = await computeBaseline("user-1", client as any) as any;

    expect(result.status).toBe("INSUFFICIENT_DATA");
    expect(result.monthlyIncomeCents).toBe(0);
    expect(result.monthlySpendingCents).toBe(0);
    expect(result.availableCents).toBe(0);
    expect(result.windowDays).toBe(0);
    expect(result.transactionCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

describe("computeBaseline — determinism", () => {
  it("same transactions produce identical output on repeated calls", async () => {
    const txns = [];
    for (let i = 0; i <= 45; i++) {
      txns.push(makeTxn({
        id: `txn-${i}`,
        amountCents: 2500,
        date: makeDate(i),
        transactionType: "EXPENSE",
      }));
    }
    txns.push(makeTxn({
      id: "pay-1",
      amountCents: -400000,
      date: makeDate(30),
      transactionType: "INCOME",
      displayName: "Payroll",
    }));
    txns.sort((a, b) => a.date.getTime() - b.date.getTime());

    const { client: client1 } = makeMockClient([...txns]);
    const { client: client2 } = makeMockClient([...txns]);

    const result1 = await computeBaseline("user-1", client1 as any) as any;
    const result2 = await computeBaseline("user-1", client2 as any) as any;

    expect(result1.monthlyIncomeCents).toBe(result2.monthlyIncomeCents);
    expect(result1.monthlySpendingCents).toBe(result2.monthlySpendingCents);
    expect(result1.availableCents).toBe(result2.availableCents);
    expect(result1.windowDays).toBe(result2.windowDays);
    expect(result1.transactionCount).toBe(result2.transactionCount);
  });
});

// ---------------------------------------------------------------------------
// Financial Correctness
// ---------------------------------------------------------------------------

describe("computeBaseline — financial correctness", () => {
  it("all output values are integers with no floating-point artifacts", async () => {
    // Use amounts that could cause float issues
    const txns = [];
    for (let i = 0; i <= 33; i++) {
      txns.push(makeTxn({
        amountCents: 3333,
        date: makeDate(i),
        transactionType: "EXPENSE",
      }));
    }
    txns.push(makeTxn({
      amountCents: -777777,
      date: makeDate(15),
      transactionType: "INCOME",
      displayName: "Payroll",
    }));
    txns.sort((a, b) => a.date.getTime() - b.date.getTime());

    const { client } = makeMockClient(txns);
    const result = await computeBaseline("user-1", client as any) as any;

    expect(Number.isInteger(result.monthlyIncomeCents)).toBe(true);
    expect(Number.isInteger(result.monthlySpendingCents)).toBe(true);
    expect(Number.isInteger(result.availableCents)).toBe(true);
    expect(Number.isInteger(result.windowDays)).toBe(true);
    expect(Number.isInteger(result.transactionCount)).toBe(true);
  });

  it("availableCents is exactly monthlyIncomeCents - monthlySpendingCents", async () => {
    const txns = [];
    for (let i = 0; i <= 50; i++) {
      txns.push(makeTxn({
        amountCents: 4567,
        date: makeDate(i),
        transactionType: "EXPENSE",
      }));
    }
    txns.push(makeTxn({
      amountCents: -123456,
      date: makeDate(25),
      transactionType: "INCOME",
      displayName: "Payroll",
    }));
    txns.sort((a, b) => a.date.getTime() - b.date.getTime());

    const { client } = makeMockClient(txns);
    const result = await computeBaseline("user-1", client as any) as any;

    expect(result.availableCents).toBe(
      result.monthlyIncomeCents - result.monthlySpendingCents,
    );
  });

  it("monthlyIncomeCents is >= 0", async () => {
    const txns = [];
    for (let i = 0; i <= 35; i++) {
      txns.push(makeTxn({
        amountCents: 2000,
        date: makeDate(i),
        transactionType: "EXPENSE",
      }));
    }
    txns.sort((a, b) => a.date.getTime() - b.date.getTime());

    const { client } = makeMockClient(txns);
    const result = await computeBaseline("user-1", client as any) as any;

    expect(result.monthlyIncomeCents).toBeGreaterThanOrEqual(0);
  });

  it("monthlySpendingCents is >= 0", async () => {
    const txns = [];
    for (let i = 0; i <= 35; i++) {
      txns.push(makeTxn({
        amountCents: 2000,
        date: makeDate(i),
        transactionType: "EXPENSE",
      }));
    }
    txns.sort((a, b) => a.date.getTime() - b.date.getTime());

    const { client } = makeMockClient(txns);
    const result = await computeBaseline("user-1", client as any) as any;

    expect(result.monthlySpendingCents).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// User Isolation
// ---------------------------------------------------------------------------

describe("computeBaseline — user isolation", () => {
  it("only processes transactions for the specified userId", async () => {
    const txns = [
      makeTxn({ amountCents: 5000, date: makeDate(0), transactionType: "EXPENSE" }),
      makeTxn({ amountCents: 5000, date: makeDate(40), transactionType: "EXPENSE" }),
    ];
    txns.sort((a, b) => a.date.getTime() - b.date.getTime());

    const findManyMock = vi.fn().mockResolvedValue(txns);
    const client = {
      normalizedTransaction: { findMany: findManyMock },
      financialBaseline: {
        upsert: vi.fn().mockImplementation((args: { create: unknown }) =>
          Promise.resolve(args.create),
        ),
      },
    };

    await computeBaseline("user-A", client as any);

    // Verify findMany was called with the correct userId
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-A" }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// Regression: Day iteration produces exactly windowDays entries (DST-safe)
// ---------------------------------------------------------------------------

describe("computeBaseline — UTC-safe day iteration", () => {
  it("windowDays matches the actual number of unique days", async () => {
    // 61 days of data spanning a DST boundary (March 8 2026 spring forward)
    const txns = [];
    for (let i = 0; i <= 60; i++) {
      txns.push(makeTxn({
        id: `day-${i}`,
        amountCents: 1000,
        date: new Date(Date.UTC(2026, 1, 1 + i)), // Feb 1 through Apr 2
        transactionType: "EXPENSE",
      }));
    }
    txns.sort((a, b) => a.date.getTime() - b.date.getTime());

    const { client } = makeMockClient(txns);
    const result = await computeBaseline("user-1", client as any) as any;

    expect(result.status).toBe("READY");
    expect(result.windowDays).toBe(61);
  });

  it("consistent spending across DST boundary — no duplicate/skipped days", async () => {
    // Create transactions around the March 8 2026 DST boundary
    // If day iteration duplicates a key, spending for that day doubles
    const txns = [];
    for (let i = 0; i <= 40; i++) {
      txns.push(makeTxn({
        id: `txn-${i}`,
        amountCents: 1000, // exactly $10 per day
        date: new Date(Date.UTC(2026, 2, 1 + i)), // March 1 through April 10
        transactionType: "EXPENSE",
      }));
    }
    txns.sort((a, b) => a.date.getTime() - b.date.getTime());

    const { client } = makeMockClient(txns);
    const result = await computeBaseline("user-1", client as any) as any;

    // With exactly $10/day for 41 days, trimmed mean should be close to $10/day * 30.44
    // The trim removes top 5% of spending days (floor(41 * 0.05) = 2, but min 1)
    // All days are identical ($10), so trimming doesn't change the mean
    // Monthly = round(1000 * 30.44) = 30440
    expect(result.monthlySpendingCents).toBe(Math.round(1000 * 30.44));
  });
});

// ---------------------------------------------------------------------------
// Regression: Trim count based on spending days, not total window days
// ---------------------------------------------------------------------------

describe("computeBaseline — trim count uses spending days", () => {
  it("sparse spender: trimming 5% of spending days, not 5% of all days", async () => {
    // 91-day window, only 20 spending days — all $100/day
    const txns = [];
    // First and last transaction define the window
    txns.push(makeTxn({
      id: "first",
      amountCents: 10000,
      date: new Date(Date.UTC(2025, 11, 25)), // Dec 25
      transactionType: "EXPENSE",
    }));
    txns.push(makeTxn({
      id: "last",
      amountCents: 10000,
      date: new Date(Date.UTC(2026, 2, 25)), // Mar 25
      transactionType: "EXPENSE",
    }));
    // 18 more spending days in between
    for (let i = 1; i <= 18; i++) {
      txns.push(makeTxn({
        id: `mid-${i}`,
        amountCents: 10000,
        date: new Date(Date.UTC(2026, 0, i * 4)), // Jan 4, 8, 12, ...
        transactionType: "EXPENSE",
      }));
    }

    txns.sort((a, b) => a.date.getTime() - b.date.getTime());
    const { client } = makeMockClient(txns);
    const result = await computeBaseline("user-1", client as any) as any;

    // 20 spending days, all identical $100
    // trimCount = max(1, floor(20 * 0.05)) = 1
    // Removing 1 of 20 identical days doesn't change the mean
    // Total window = 91 days, so daily average = (20 * 10000) / 90 after trim
    // With the old bug (floor(91 * 0.05) = 4), we'd remove 4 of 20 = much lower
    // The correct result: trimming 1 day from sorted array of 91 entries
    // (71 zeros + 20 at 10000), remove the top 1 → still 19 days at 10000
    // mean = (19 * 10000) / 90 = 2111.11, monthly = round(2111.11 * 30.44) = 64262

    // The key assertion: spending should NOT be dramatically understated
    // If trim was based on sorted.length (91), trimCount would be 4,
    // removing 4 spending days → mean = (16 * 10000) / 87 = 1839.08 → monthly = 55,983
    // With correct trim (1 day), result should be higher
    expect(result.monthlySpendingCents).toBeGreaterThan(56000);
    expect(result.status).toBe("READY");
  });
});
