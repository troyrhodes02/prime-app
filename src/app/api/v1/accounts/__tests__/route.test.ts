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
    financialAccount: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

describe("GET /api/v1/accounts", () => {
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

  it("returns empty accounts array when none exist", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "sb-123" } } });
    mockFindUnique.mockResolvedValue({ id: "user-1" });
    mockFindMany.mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.accounts).toEqual([]);
    expect(body.total).toBe(0);
  });

  it("returns accounts with institution_name denormalized", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "sb-123" } } });
    mockFindUnique.mockResolvedValue({ id: "user-1" });
    mockFindMany.mockResolvedValue([
      {
        id: "fa-1",
        name: "Total Checking",
        type: "DEPOSITORY",
        mask: "4829",
        isActive: true,
        plaidItem: { institutionName: "Chase" },
        createdAt: new Date(),
      },
      {
        id: "fa-2",
        name: "Freedom Unlimited",
        type: "CREDIT",
        mask: "3156",
        isActive: true,
        plaidItem: { institutionName: "Chase" },
        createdAt: new Date(),
      },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.total).toBe(2);
    expect(body.accounts[0].name).toBe("Total Checking");
    expect(body.accounts[0].institution_name).toBe("Chase");
    expect(body.accounts[0].type).toBe("DEPOSITORY");
    expect(body.accounts[0].mask).toBe("4829");
    expect(body.accounts[0].is_active).toBe(true);
  });

  it("does not expose balance fields", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "sb-123" } } });
    mockFindUnique.mockResolvedValue({ id: "user-1" });
    mockFindMany.mockResolvedValue([
      {
        id: "fa-1",
        name: "Checking",
        type: "DEPOSITORY",
        mask: "1234",
        isActive: true,
        plaidItem: { institutionName: "Chase" },
        createdAt: new Date(),
      },
    ]);

    const response = await GET();
    const body = await response.json();

    const account = body.accounts[0];
    expect(account).not.toHaveProperty("currentBalanceCents");
    expect(account).not.toHaveProperty("availableBalanceCents");
    expect(account).not.toHaveProperty("isoCurrencyCode");
  });
});
