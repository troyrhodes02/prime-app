import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";

const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
  }),
}));

const mockUserFindUnique = vi.fn();
const mockClassificationFindUnique = vi.fn();
const mockNormalizedCount = vi.fn();
const mockNormalizedFindMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    expenseClassification: {
      findUnique: (...args: unknown[]) => mockClassificationFindUnique(...args),
    },
    normalizedTransaction: {
      count: (...args: unknown[]) => mockNormalizedCount(...args),
      findMany: (...args: unknown[]) => mockNormalizedFindMany(...args),
    },
  },
}));

const mockComputeClassification = vi.fn();

vi.mock("@/services/classification", () => ({
  computeExpenseClassification: (...args: unknown[]) => mockComputeClassification(...args),
}));

const COMPUTED_AT = new Date("2026-03-25T14:30:00.000Z");

function makeClassification(overrides: Partial<{
  status: string;
  fixedCents: number;
  flexibleCents: number;
  fixedPct: number;
  flexiblePct: number;
  fixedCategories: unknown;
  flexibleCategories: unknown;
  windowDays: number;
  transactionCount: number;
  computedAt: Date;
}> = {}) {
  return {
    status: overrides.status ?? "READY",
    fixedCents: overrides.fixedCents ?? 185000,
    flexibleCents: overrides.flexibleCents ?? 173000,
    fixedPct: overrides.fixedPct ?? 52,
    flexiblePct: overrides.flexiblePct ?? 48,
    fixedCategories: overrides.fixedCategories ?? [
      { category: "HOUSING", label: "Housing", totalCents: 120000, pct: 34 },
      { category: "UTILITIES", label: "Utilities", totalCents: 65000, pct: 18 },
    ],
    flexibleCategories: overrides.flexibleCategories ?? [
      { category: "FOOD_AND_DRINK", label: "Food & Drink", totalCents: 95000, pct: 27 },
      { category: "SHOPPING", label: "Shopping", totalCents: 78000, pct: 21 },
    ],
    windowDays: overrides.windowDays ?? 87,
    transactionCount: overrides.transactionCount ?? 245,
    computedAt: overrides.computedAt ?? COMPUTED_AT,
  };
}

function setupAuth(userId: string | null) {
  if (!userId) {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    return;
  }
  mockGetUser.mockResolvedValue({ data: { user: { id: "sb-123" } } });
  mockUserFindUnique.mockResolvedValue({ id: userId });
}

describe("GET /api/v1/expense-classification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: current month query returns empty (no current month transactions)
    mockNormalizedFindMany.mockResolvedValue([]);
  });

  // -------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------

  it("returns 401 when no supabase session", async () => {
    setupAuth(null);
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("unauthorized");
  });

  it("returns 401 when no prisma user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "sb-123" } } });
    mockUserFindUnique.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  // -------------------------------------------------------------------
  // Status: ready
  // -------------------------------------------------------------------

  it("returns 200 with status ready, snake_case fields, and current_month", async () => {
    setupAuth("user-1");
    const classification = makeClassification();
    mockClassificationFindUnique.mockResolvedValue(classification);
    mockNormalizedCount.mockResolvedValue(0); // no newer txns = fresh
    mockNormalizedFindMany.mockResolvedValue([
      { amountCents: 80000, expenseType: "FIXED" },
      { amountCents: 45000, expenseType: "FLEXIBLE" },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ready");
    expect(body.fixed_cents).toBe(185000);
    expect(body.flexible_cents).toBe(173000);
    expect(body.fixed_pct).toBe(52);
    expect(body.flexible_pct).toBe(48);
    expect(body.fixed_categories).toEqual([
      { category: "HOUSING", label: "Housing", totalCents: 120000, pct: 34 },
      { category: "UTILITIES", label: "Utilities", totalCents: 65000, pct: 18 },
    ]);
    expect(body.flexible_categories).toEqual([
      { category: "FOOD_AND_DRINK", label: "Food & Drink", totalCents: 95000, pct: 27 },
      { category: "SHOPPING", label: "Shopping", totalCents: 78000, pct: 21 },
    ]);
    expect(body.window_days).toBe(87);
    expect(body.transaction_count).toBe(245);
    expect(body.computed_at).toBe("2026-03-25T14:30:00.000Z");

    // Current month breakdown
    expect(body.current_month).toBeDefined();
    expect(body.current_month.fixed_cents).toBe(80000);
    expect(body.current_month.flexible_cents).toBe(45000);
    expect(body.current_month.fixed_pct).toBe(64);
    expect(body.current_month.flexible_pct).toBe(36);
    expect(body.current_month.transaction_count).toBe(2);
    expect(body.current_month.days_elapsed).toBeGreaterThan(0);
    expect(body.current_month.days_in_month).toBeGreaterThanOrEqual(28);
  });

  // -------------------------------------------------------------------
  // Current month: empty when no transactions this month
  // -------------------------------------------------------------------

  it("returns current_month with zeros when no transactions this month", async () => {
    setupAuth("user-1");
    mockClassificationFindUnique.mockResolvedValue(makeClassification());
    mockNormalizedCount.mockResolvedValue(0);
    mockNormalizedFindMany.mockResolvedValue([]); // no current month txns

    const response = await GET();
    const body = await response.json();

    expect(body.status).toBe("ready");
    expect(body.current_month.fixed_cents).toBe(0);
    expect(body.current_month.flexible_cents).toBe(0);
    expect(body.current_month.transaction_count).toBe(0);
  });

  // -------------------------------------------------------------------
  // Status: insufficient_data — no current_month
  // -------------------------------------------------------------------

  it("returns insufficient_data without current_month", async () => {
    setupAuth("user-1");
    const classification = makeClassification({
      status: "INSUFFICIENT_DATA",
      fixedCents: 0,
      flexibleCents: 0,
      fixedPct: 0,
      flexiblePct: 0,
      fixedCategories: [],
      flexibleCategories: [],
      windowDays: 18,
      transactionCount: 42,
    });
    mockClassificationFindUnique.mockResolvedValue(classification);
    mockNormalizedCount.mockResolvedValue(0);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("insufficient_data");
    expect(body).not.toHaveProperty("current_month");
  });

  // -------------------------------------------------------------------
  // Status: unavailable
  // -------------------------------------------------------------------

  it("returns 200 with status unavailable when no transactions", async () => {
    setupAuth("user-1");
    mockClassificationFindUnique.mockResolvedValue(null); // no classification
    mockNormalizedCount.mockResolvedValue(0); // no expense transactions

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("unavailable");
    expect(body).not.toHaveProperty("fixed_cents");
    expect(body).not.toHaveProperty("current_month");
  });

  // -------------------------------------------------------------------
  // Staleness — recompute
  // -------------------------------------------------------------------

  it("recomputes stale classification before responding", async () => {
    setupAuth("user-1");
    const staleClassification = makeClassification();
    mockClassificationFindUnique.mockResolvedValue(staleClassification);
    mockNormalizedCount.mockResolvedValue(5); // newer txns = stale

    const freshClassification = makeClassification({
      fixedCents: 200000,
      flexibleCents: 160000,
      fixedPct: 56,
      flexiblePct: 44,
    });
    mockComputeClassification.mockResolvedValue(freshClassification);

    const response = await GET();
    const body = await response.json();

    expect(mockComputeClassification).toHaveBeenCalledWith("user-1");
    expect(body.fixed_cents).toBe(200000);
    expect(body.flexible_cents).toBe(160000);
    expect(body.fixed_pct).toBe(56);
    expect(body.flexible_pct).toBe(44);
    expect(body.current_month).toBeDefined();
  });

  // -------------------------------------------------------------------
  // Fresh — no recompute
  // -------------------------------------------------------------------

  it("returns cached classification without recomputation when fresh", async () => {
    setupAuth("user-1");
    mockClassificationFindUnique.mockResolvedValue(makeClassification());
    mockNormalizedCount.mockResolvedValue(0); // no newer txns

    await GET();

    expect(mockComputeClassification).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // No classification but transactions exist — compute on first call
  // -------------------------------------------------------------------

  it("computes classification on first call when expense transactions exist", async () => {
    setupAuth("user-1");
    mockClassificationFindUnique.mockResolvedValue(null); // no classification
    mockNormalizedCount.mockResolvedValue(100); // has expense transactions

    const computed = makeClassification();
    mockComputeClassification.mockResolvedValue(computed);

    const response = await GET();
    const body = await response.json();

    expect(mockComputeClassification).toHaveBeenCalledWith("user-1");
    expect(body.status).toBe("ready");
    expect(body.fixed_cents).toBe(185000);
    expect(body.current_month).toBeDefined();
  });

  // -------------------------------------------------------------------
  // User isolation
  // -------------------------------------------------------------------

  it("queries classification and transactions scoped to the authenticated user", async () => {
    setupAuth("user-A");
    mockClassificationFindUnique.mockResolvedValue(null);
    mockNormalizedCount.mockResolvedValue(0);

    await GET();

    expect(mockClassificationFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-A" },
      }),
    );
    expect(mockNormalizedCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-A" }),
      }),
    );
  });

  // -------------------------------------------------------------------
  // Regression: cached INSUFFICIENT_DATA with 0 transactions = unavailable
  // -------------------------------------------------------------------

  it("returns unavailable when cached classification has INSUFFICIENT_DATA and transactionCount=0", async () => {
    setupAuth("user-1");
    mockClassificationFindUnique.mockResolvedValue(makeClassification({
      status: "INSUFFICIENT_DATA",
      fixedCents: 0,
      flexibleCents: 0,
      fixedPct: 0,
      flexiblePct: 0,
      fixedCategories: [],
      flexibleCategories: [],
      windowDays: 0,
      transactionCount: 0,
    }));
    mockNormalizedCount.mockResolvedValue(0); // fresh (no newer txns)

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("unavailable");
    expect(body).not.toHaveProperty("fixed_cents");
  });

  // -------------------------------------------------------------------
  // Staleness query omits transactionType to catch INCOME changes
  // -------------------------------------------------------------------

  it("staleness query does not filter by transactionType so INCOME changes trigger recompute", async () => {
    setupAuth("user-1");
    mockClassificationFindUnique.mockResolvedValue(makeClassification());
    mockNormalizedCount.mockResolvedValue(0); // fresh

    await GET();

    const stalenessCall = mockNormalizedCount.mock.calls[0][0];
    expect(stalenessCall.where).toHaveProperty("pending", false);
    expect(stalenessCall.where).not.toHaveProperty("transactionType");
    expect(mockComputeClassification).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // Preflight count applies 90-day window and category exclusions
  // -------------------------------------------------------------------

  it("preflight count applies date window and excludes INCOME/TRANSFER categories", async () => {
    setupAuth("user-1");
    mockClassificationFindUnique.mockResolvedValue(null); // no classification
    mockNormalizedCount.mockResolvedValue(0); // no eligible transactions

    await GET();

    const preflightCall = mockNormalizedCount.mock.calls[0][0];
    expect(preflightCall.where).toHaveProperty("transactionType", "EXPENSE");
    expect(preflightCall.where).toHaveProperty("isActive", true);
    expect(preflightCall.where).toHaveProperty("pending", false);
    expect(preflightCall.where.date).toHaveProperty("gte");
    expect(preflightCall.where.category).toEqual({ notIn: ["INCOME", "TRANSFER"] });
  });

  // -------------------------------------------------------------------
  // Current month query scoped to user and current month
  // -------------------------------------------------------------------

  it("current month query filters by userId, current month, and classified transactions", async () => {
    setupAuth("user-1");
    mockClassificationFindUnique.mockResolvedValue(makeClassification());
    mockNormalizedCount.mockResolvedValue(0);
    mockNormalizedFindMany.mockResolvedValue([]);

    await GET();

    expect(mockNormalizedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
          isActive: true,
          pending: false,
          transactionType: "EXPENSE",
          expenseType: { not: null },
        }),
      }),
    );

    // Verify date filter is first of current month
    const findManyCall = mockNormalizedFindMany.mock.calls[0][0];
    const dateGte = findManyCall.where.date.gte;
    expect(dateGte.getUTCDate()).toBe(1);
  });
});
