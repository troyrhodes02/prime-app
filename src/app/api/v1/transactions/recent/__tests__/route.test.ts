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

const mockFindUnique = vi.fn();
const mockFindMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    normalizedTransaction: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

function authAsUser() {
  mockGetUser.mockResolvedValue({ data: { user: { id: "sb-123" } } });
  mockFindUnique.mockResolvedValue({ id: "user-1" });
}

describe("GET /api/v1/transactions/recent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no supabase session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns 401 when no prisma user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "sb-123" } } });
    mockFindUnique.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns max 5 non-pending transactions", async () => {
    authAsUser();
    const transactions = Array.from({ length: 5 }, (_, i) => ({
      id: `txn-${i}`,
      amountCents: 1000 * (i + 1),
      isoCurrencyCode: "USD",
      date: new Date(`2026-03-${20 - i}T00:00:00.000Z`),
      displayName: `Merchant ${i}`,
      transactionType: "EXPENSE",
      pending: false,
      account: { id: "acc-1", name: "Checking", type: "DEPOSITORY", mask: "1234" },
    }));
    mockFindMany.mockResolvedValue(transactions);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.transactions).toHaveLength(5);
  });

  it("queries with take: 5, pending: false, isActive: true", async () => {
    authAsUser();
    mockFindMany.mockResolvedValue([]);

    await GET();

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
          isActive: true,
          pending: false,
        }),
        take: 5,
      }),
    );
  });

  it("does not include original_name, merchant_name, or category in response", async () => {
    authAsUser();
    mockFindMany.mockResolvedValue([{
      id: "txn-1",
      amountCents: 4299,
      isoCurrencyCode: "USD",
      date: new Date("2026-03-22T00:00:00.000Z"),
      displayName: "Starbucks",
      transactionType: "EXPENSE",
      pending: false,
      account: { id: "acc-1", name: "Checking", type: "DEPOSITORY", mask: "1234" },
    }]);

    const response = await GET();
    const body = await response.json();

    const txn = body.transactions[0];
    expect(txn).not.toHaveProperty("original_name");
    expect(txn).not.toHaveProperty("merchant_name");
    expect(txn).not.toHaveProperty("category");
    expect(txn).toHaveProperty("display_name");
    expect(txn).toHaveProperty("transaction_type");
  });

  it("returns empty array when no transactions", async () => {
    authAsUser();
    mockFindMany.mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    expect(body.transactions).toEqual([]);
  });

  it("sorts by date desc then amountCents desc", async () => {
    authAsUser();
    mockFindMany.mockResolvedValue([]);

    await GET();

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ date: "desc" }, { amountCents: "desc" }],
      }),
    );
  });
});
