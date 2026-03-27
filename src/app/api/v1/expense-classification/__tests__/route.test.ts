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

  it("returns 200 with status ready and snake_case fields", async () => {
    setupAuth("user-1");
    const classification = makeClassification();
    mockClassificationFindUnique.mockResolvedValue(classification);
    mockNormalizedCount.mockResolvedValue(0); // no newer txns = fresh

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
  });

  // -------------------------------------------------------------------
  // Status: insufficient_data
  // -------------------------------------------------------------------

  it("returns 200 with status insufficient_data when window too short", async () => {
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
    expect(body.fixed_cents).toBe(0);
    expect(body.flexible_cents).toBe(0);
    expect(body.window_days).toBe(18);
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
  // Staleness query checks expense transactions specifically
  // -------------------------------------------------------------------

  it("staleness query filters by transactionType EXPENSE", async () => {
    setupAuth("user-1");
    mockClassificationFindUnique.mockResolvedValue(makeClassification());
    mockNormalizedCount.mockResolvedValue(0); // fresh

    await GET();

    // The staleness count call should include transactionType: "EXPENSE"
    expect(mockNormalizedCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          transactionType: "EXPENSE",
          pending: false,
        }),
      }),
    );
    expect(mockComputeClassification).not.toHaveBeenCalled();
  });
});
