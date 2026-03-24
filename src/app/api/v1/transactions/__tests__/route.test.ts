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

const mockFindUnique = vi.fn();
const mockFindMany = vi.fn();
const mockCount = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    normalizedTransaction: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
  },
}));

function makeRequest(query: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/v1/transactions");
  for (const [k, v] of Object.entries(query)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

const mockUser = { id: "user-1" };

function authAsUser() {
  mockGetUser.mockResolvedValue({ data: { user: { id: "sb-123" } } });
  mockFindUnique.mockResolvedValue(mockUser);
}

const sampleTransaction = {
  id: "txn-1",
  amountCents: 4299,
  isoCurrencyCode: "USD",
  date: new Date("2026-03-22T00:00:00.000Z"),
  displayName: "Starbucks",
  originalName: "TST* STARBUCKS #12345",
  merchantName: "Starbucks",
  category: "FOOD_AND_DRINK",
  transactionType: "EXPENSE",
  pending: false,
  account: { id: "acc-1", name: "Total Checking", type: "DEPOSITORY", mask: "4829" },
};

describe("GET /api/v1/transactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no supabase session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const response = await GET(makeRequest());
    expect(response.status).toBe(401);
  });

  it("returns 401 when no prisma user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "sb-123" } } });
    mockFindUnique.mockResolvedValue(null);
    const response = await GET(makeRequest());
    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid days value", async () => {
    authAsUser();
    const response = await GET(makeRequest({ days: "7" }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("validation_error");
  });

  it("returns 400 for invalid type value", async () => {
    authAsUser();
    const response = await GET(makeRequest({ type: "savings" }));
    expect(response.status).toBe(400);
  });

  it("returns transactions with correct response shape", async () => {
    authAsUser();
    mockFindMany.mockResolvedValue([sampleTransaction]);
    mockCount
      .mockResolvedValueOnce(1)  // filtered_count
      .mockResolvedValueOnce(5); // total

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.transactions).toHaveLength(1);
    expect(body.transactions[0]).toEqual({
      id: "txn-1",
      amount_cents: 4299,
      iso_currency_code: "USD",
      date: "2026-03-22",
      display_name: "Starbucks",
      original_name: "TST* STARBUCKS #12345",
      merchant_name: "Starbucks",
      category: "FOOD_AND_DRINK",
      transaction_type: "EXPENSE",
      pending: false,
      account: { id: "acc-1", name: "Total Checking", type: "DEPOSITORY", mask: "4829" },
    });
    expect(body.total).toBe(5);
    expect(body.filtered_count).toBe(1);
  });

  it("returns empty results when no transactions exist", async () => {
    authAsUser();
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.transactions).toEqual([]);
    expect(body.total).toBe(0);
    expect(body.filtered_count).toBe(0);
  });

  it("passes accountId filter to query", async () => {
    authAsUser();
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await GET(makeRequest({ accountId: "acc-1" }));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          financialAccountId: "acc-1",
        }),
      }),
    );
  });

  it("passes type=income filter to query", async () => {
    authAsUser();
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await GET(makeRequest({ type: "income" }));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          transactionType: "INCOME",
        }),
      }),
    );
  });

  it("passes type=expense filter to query", async () => {
    authAsUser();
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await GET(makeRequest({ type: "expense" }));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          transactionType: "EXPENSE",
        }),
      }),
    );
  });

  it("always filters by userId and isActive", async () => {
    authAsUser();
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await GET(makeRequest());

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
          isActive: true,
        }),
      }),
    );
  });

  it("accepts days=90", async () => {
    authAsUser();
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const response = await GET(makeRequest({ days: "90" }));
    expect(response.status).toBe(200);
  });

  it("sorts by date desc then amountCents desc", async () => {
    authAsUser();
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await GET(makeRequest());

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ date: "desc" }, { amountCents: "desc" }],
      }),
    );
  });
});
