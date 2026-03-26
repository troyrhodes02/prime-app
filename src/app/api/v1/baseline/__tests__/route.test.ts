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
const mockBaselineFindUnique = vi.fn();
const mockNormalizedCount = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    financialBaseline: {
      findUnique: (...args: unknown[]) => mockBaselineFindUnique(...args),
    },
    normalizedTransaction: {
      count: (...args: unknown[]) => mockNormalizedCount(...args),
    },
  },
}));

const mockComputeBaseline = vi.fn();

vi.mock("@/services/baseline", () => ({
  computeBaseline: (...args: unknown[]) => mockComputeBaseline(...args),
}));

const COMPUTED_AT = new Date("2026-03-25T14:30:00.000Z");

function makeBaseline(overrides: Partial<{
  status: string;
  monthlyIncomeCents: number;
  monthlySpendingCents: number;
  availableCents: number;
  windowDays: number;
  transactionCount: number;
  computedAt: Date;
}> = {}) {
  return {
    status: overrides.status ?? "READY",
    monthlyIncomeCents: overrides.monthlyIncomeCents ?? 482000,
    monthlySpendingCents: overrides.monthlySpendingCents ?? 358000,
    availableCents: overrides.availableCents ?? 124000,
    windowDays: overrides.windowDays ?? 87,
    transactionCount: overrides.transactionCount ?? 342,
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

describe("GET /api/v1/baseline", () => {
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

  it("returns 200 with status ready for user with fresh baseline", async () => {
    setupAuth("user-1");
    const baseline = makeBaseline();
    mockBaselineFindUnique.mockResolvedValue(baseline);
    mockNormalizedCount.mockResolvedValue(0); // no newer txns = fresh

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ready");
    expect(body.monthly_income_cents).toBe(482000);
    expect(body.monthly_spending_cents).toBe(358000);
    expect(body.available_cents).toBe(124000);
    expect(body.window_days).toBe(87);
    expect(body.transaction_count).toBe(342);
    expect(body.computed_at).toBe("2026-03-25T14:30:00.000Z");
  });

  // -------------------------------------------------------------------
  // Status: insufficient_data
  // -------------------------------------------------------------------

  it("returns 200 with status insufficient_data for < 30 days", async () => {
    setupAuth("user-1");
    const baseline = makeBaseline({
      status: "INSUFFICIENT_DATA",
      monthlyIncomeCents: 0,
      monthlySpendingCents: 0,
      availableCents: 0,
      windowDays: 18,
      transactionCount: 42,
    });
    mockBaselineFindUnique.mockResolvedValue(baseline);
    mockNormalizedCount.mockResolvedValue(0);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("insufficient_data");
    expect(body.monthly_income_cents).toBe(0);
    expect(body.monthly_spending_cents).toBe(0);
    expect(body.available_cents).toBe(0);
    expect(body.window_days).toBe(18);
  });

  // -------------------------------------------------------------------
  // Status: unavailable
  // -------------------------------------------------------------------

  it("returns 200 with status unavailable when no transactions", async () => {
    setupAuth("user-1");
    mockBaselineFindUnique.mockResolvedValue(null); // no baseline
    mockNormalizedCount.mockResolvedValue(0); // no transactions

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("unavailable");
    expect(body).not.toHaveProperty("monthly_income_cents");
  });

  // -------------------------------------------------------------------
  // Staleness — recompute
  // -------------------------------------------------------------------

  it("recomputes stale baseline before responding", async () => {
    setupAuth("user-1");
    const staleBaseline = makeBaseline();
    mockBaselineFindUnique.mockResolvedValue(staleBaseline);
    mockNormalizedCount.mockResolvedValue(5); // newer txns = stale

    const freshBaseline = makeBaseline({
      monthlyIncomeCents: 500000,
      monthlySpendingCents: 370000,
      availableCents: 130000,
    });
    mockComputeBaseline.mockResolvedValue(freshBaseline);

    const response = await GET();
    const body = await response.json();

    expect(mockComputeBaseline).toHaveBeenCalledWith("user-1");
    expect(body.monthly_income_cents).toBe(500000);
    expect(body.available_cents).toBe(130000);
  });

  // -------------------------------------------------------------------
  // Fresh — no recompute
  // -------------------------------------------------------------------

  it("returns cached baseline without recomputation when fresh", async () => {
    setupAuth("user-1");
    mockBaselineFindUnique.mockResolvedValue(makeBaseline());
    mockNormalizedCount.mockResolvedValue(0); // no newer txns

    await GET();

    expect(mockComputeBaseline).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // No baseline but transactions exist — compute on first call
  // -------------------------------------------------------------------

  it("computes baseline on first call when transactions exist", async () => {
    setupAuth("user-1");
    mockBaselineFindUnique.mockResolvedValue(null); // no baseline
    mockNormalizedCount.mockResolvedValue(100); // has transactions

    const computed = makeBaseline();
    mockComputeBaseline.mockResolvedValue(computed);

    const response = await GET();
    const body = await response.json();

    expect(mockComputeBaseline).toHaveBeenCalledWith("user-1");
    expect(body.status).toBe("ready");
    expect(body.monthly_income_cents).toBe(482000);
  });

  // -------------------------------------------------------------------
  // User isolation
  // -------------------------------------------------------------------

  it("queries baseline and transactions scoped to the authenticated user", async () => {
    setupAuth("user-A");
    mockBaselineFindUnique.mockResolvedValue(null);
    mockNormalizedCount.mockResolvedValue(0);

    await GET();

    expect(mockBaselineFindUnique).toHaveBeenCalledWith(
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
});
