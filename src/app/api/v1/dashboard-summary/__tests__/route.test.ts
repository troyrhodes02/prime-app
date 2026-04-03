import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
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

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
  },
}));

const mockComputeSummary = vi.fn();

vi.mock("@/services/dashboard-summary", () => ({
  computeDashboardSummary: (...args: unknown[]) => mockComputeSummary(...args),
}));

function makeRequest(query: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/v1/dashboard-summary");
  for (const [k, v] of Object.entries(query)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

function setupAuth(userId: string | null) {
  if (!userId) {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    return;
  }
  mockGetUser.mockResolvedValue({ data: { user: { id: "sb-123" } } });
  mockUserFindUnique.mockResolvedValue({ id: userId });
}

const readySummary = {
  status: "ready" as const,
  incomeCents: 450000,
  spendingCents: 320000,
  availableCents: 130000,
  fixedCents: 180000,
  flexibleCents: 140000,
  fixedPct: 56,
  flexiblePct: 44,
  windowDays: 27,
  transactionCount: 85,
};

const noDataSummary = {
  status: "no_data" as const,
  incomeCents: 0,
  spendingCents: 0,
  availableCents: 0,
  fixedCents: 0,
  flexibleCents: 0,
  fixedPct: 0,
  flexiblePct: 0,
  windowDays: 27,
  transactionCount: 0,
};

describe("GET /api/v1/dashboard-summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------

  it("returns 401 when no supabase session", async () => {
    setupAuth(null);
    const response = await GET(makeRequest());
    expect(response.status).toBe(401);
  });

  it("returns 401 when no prisma user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "sb-123" } } });
    mockUserFindUnique.mockResolvedValue(null);
    const response = await GET(makeRequest());
    expect(response.status).toBe(401);
  });

  // -------------------------------------------------------------------
  // Default period
  // -------------------------------------------------------------------

  it("defaults to this_month when no period param", async () => {
    setupAuth("user-1");
    mockComputeSummary.mockResolvedValue(readySummary);

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(mockComputeSummary).toHaveBeenCalledWith("user-1", "this_month");
    expect(body.period).toBe("this_month");
    expect(body.status).toBe("ready");
  });

  // -------------------------------------------------------------------
  // Period params
  // -------------------------------------------------------------------

  it("passes last_30 period to service", async () => {
    setupAuth("user-1");
    mockComputeSummary.mockResolvedValue(readySummary);

    await GET(makeRequest({ period: "last_30" }));

    expect(mockComputeSummary).toHaveBeenCalledWith("user-1", "last_30");
  });

  it("passes last_60 period to service", async () => {
    setupAuth("user-1");
    mockComputeSummary.mockResolvedValue(readySummary);

    await GET(makeRequest({ period: "last_60" }));

    expect(mockComputeSummary).toHaveBeenCalledWith("user-1", "last_60");
  });

  it("passes last_90 period to service", async () => {
    setupAuth("user-1");
    mockComputeSummary.mockResolvedValue(readySummary);

    await GET(makeRequest({ period: "last_90" }));

    expect(mockComputeSummary).toHaveBeenCalledWith("user-1", "last_90");
  });

  it("returns 400 for invalid period", async () => {
    setupAuth("user-1");

    const response = await GET(makeRequest({ period: "last_999" }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("validation_error");
  });

  // -------------------------------------------------------------------
  // Response shape — ready
  // -------------------------------------------------------------------

  it("returns snake_case response with all fields when ready", async () => {
    setupAuth("user-1");
    mockComputeSummary.mockResolvedValue(readySummary);

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ready");
    expect(body.income_cents).toBe(450000);
    expect(body.spending_cents).toBe(320000);
    expect(body.available_cents).toBe(130000);
    expect(body.fixed_cents).toBe(180000);
    expect(body.flexible_cents).toBe(140000);
    expect(body.fixed_pct).toBe(56);
    expect(body.flexible_pct).toBe(44);
    expect(body.window_days).toBe(27);
    expect(body.transaction_count).toBe(85);
    expect(body.period).toBe("this_month");
    expect(body.period_label).toBeDefined();
  });

  // -------------------------------------------------------------------
  // Response shape — no_data
  // -------------------------------------------------------------------

  it("returns no_data status when no transactions", async () => {
    setupAuth("user-1");
    mockComputeSummary.mockResolvedValue(noDataSummary);

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(body.status).toBe("no_data");
    expect(body.income_cents).toBe(0);
    expect(body.spending_cents).toBe(0);
    expect(body.transaction_count).toBe(0);
  });

  // -------------------------------------------------------------------
  // User isolation
  // -------------------------------------------------------------------

  it("passes authenticated user ID to service", async () => {
    setupAuth("user-A");
    mockComputeSummary.mockResolvedValue(readySummary);

    await GET(makeRequest({ period: "last_90" }));

    expect(mockComputeSummary).toHaveBeenCalledWith("user-A", "last_90");
  });

  // -------------------------------------------------------------------
  // Period label
  // -------------------------------------------------------------------

  it("returns human-readable period_label for rolling window", async () => {
    setupAuth("user-1");
    mockComputeSummary.mockResolvedValue(readySummary);

    const response = await GET(makeRequest({ period: "last_30" }));
    const body = await response.json();

    expect(body.period_label).toBe("Last 30 Days");
  });

  it("returns month name for this_month period", async () => {
    setupAuth("user-1");
    mockComputeSummary.mockResolvedValue(readySummary);

    const response = await GET(makeRequest({ period: "this_month" }));
    const body = await response.json();

    // Should be current month name like "March 2026"
    expect(body.period_label).toMatch(/\w+ \d{4}/);
  });
});
