import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
  }),
}));

const mockFindUnique = vi.fn();
const mockTransaction = vi.fn();
const mockFindUniqueItem = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    plaidItem: {
      findUnique: (...args: unknown[]) => mockFindUniqueItem(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

const mockItemPublicTokenExchange = vi.fn();
const mockAccountsGet = vi.fn();

vi.mock("@/lib/plaid", () => ({
  plaidClient: {
    itemPublicTokenExchange: (...args: unknown[]) => mockItemPublicTokenExchange(...args),
    accountsGet: (...args: unknown[]) => mockAccountsGet(...args),
  },
}));

vi.mock("@/lib/encryption", () => ({
  encrypt: vi.fn().mockReturnValue("encrypted-token"),
}));

vi.mock("@/services/sync", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/sync")>();
  return {
    ...actual,
    runSyncPipeline: vi.fn().mockResolvedValue(undefined),
  };
});

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/v1/plaid/exchange-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  public_token: "public-sandbox-abc123",
  institution: { institution_id: "ins_3", name: "Chase" },
  accounts: [
    {
      id: "acc-1",
      name: "Total Checking",
      official_name: "TOTAL CHECKING",
      type: "depository",
      subtype: "checking",
      mask: "4829",
    },
  ],
};

describe("POST /api/v1/plaid/exchange-token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no supabase session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(401);
  });

  it("returns 401 when no prisma user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "sb-123" } } });
    mockFindUnique.mockResolvedValue(null);

    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(401);
  });

  it("returns 400 on missing public_token", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "sb-123" } } });
    mockFindUnique.mockResolvedValue({ id: "user-1" });

    const response = await POST(makeRequest({ institution: {}, accounts: [] }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("validation_error");
  });

  it("returns 400 on empty accounts array", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "sb-123" } } });
    mockFindUnique.mockResolvedValue({ id: "user-1" });

    const response = await POST(
      makeRequest({ ...validBody, accounts: [] }),
    );

    expect(response.status).toBe(400);
  });

  it("returns 502 when Plaid token exchange fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "sb-123" } } });
    mockFindUnique.mockResolvedValue({ id: "user-1" });
    mockItemPublicTokenExchange.mockRejectedValue(new Error("Plaid down"));

    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error).toBe("plaid_unavailable");
  });

  it("returns 409 when PlaidItem already exists", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "sb-123" } } });
    mockFindUnique.mockResolvedValue({ id: "user-1" });
    mockItemPublicTokenExchange.mockResolvedValue({
      data: { access_token: "access-sandbox-xyz", item_id: "item-123" },
    });
    mockFindUniqueItem.mockResolvedValue({ id: "existing-item" });

    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("duplicate_resource");
  });

  it("returns 502 when Plaid accountsGet fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "sb-123" } } });
    mockFindUnique.mockResolvedValue({ id: "user-1" });
    mockItemPublicTokenExchange.mockResolvedValue({
      data: { access_token: "access-sandbox-xyz", item_id: "item-new" },
    });
    mockFindUniqueItem.mockResolvedValue(null);
    mockAccountsGet.mockRejectedValue(new Error("Plaid accounts error"));

    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error).toBe("plaid_unavailable");
  });

  it("returns 201 on success with plaid_item_id, sync_job_id, accounts_created", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "sb-123" } } });
    mockFindUnique.mockResolvedValue({ id: "user-1" });
    mockItemPublicTokenExchange.mockResolvedValue({
      data: { access_token: "access-sandbox-xyz", item_id: "item-new" },
    });
    mockFindUniqueItem.mockResolvedValue(null);
    mockAccountsGet.mockResolvedValue({
      data: {
        accounts: [
          {
            account_id: "acc-1",
            name: "Total Checking",
            official_name: "TOTAL CHECKING",
            type: "depository",
            subtype: "checking",
            mask: "4829",
          },
        ],
      },
    });
    mockTransaction.mockResolvedValue({
      plaidItem: { id: "pi-1" },
      accountRecords: [{ id: "fa-1" }],
      syncJob: { id: "sj-1" },
    });

    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.plaid_item_id).toBe("pi-1");
    expect(body.sync_job_id).toBe("sj-1");
    expect(body.accounts_created).toBe(1);
  });

  it("accepts null institution", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "sb-123" } } });
    mockFindUnique.mockResolvedValue({ id: "user-1" });
    mockItemPublicTokenExchange.mockResolvedValue({
      data: { access_token: "access-sandbox-xyz", item_id: "item-null-inst" },
    });
    mockFindUniqueItem.mockResolvedValue(null);
    mockAccountsGet.mockResolvedValue({
      data: { accounts: [{ account_id: "acc-1", name: "Checking", official_name: null, type: "depository", subtype: "checking", mask: "1234" }] },
    });
    mockTransaction.mockResolvedValue({
      plaidItem: { id: "pi-2" },
      accountRecords: [{ id: "fa-2" }],
      syncJob: { id: "sj-2" },
    });

    const response = await POST(
      makeRequest({ ...validBody, institution: null }),
    );

    expect(response.status).toBe(201);
  });

  it("calls $transaction with a function", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "sb-123" } } });
    mockFindUnique.mockResolvedValue({ id: "user-1" });
    mockItemPublicTokenExchange.mockResolvedValue({
      data: { access_token: "access-sandbox-xyz", item_id: "item-new2" },
    });
    mockFindUniqueItem.mockResolvedValue(null);
    mockAccountsGet.mockResolvedValue({
      data: { accounts: [{ account_id: "acc-1", name: "Checking", official_name: null, type: "depository", subtype: "checking", mask: "1234" }] },
    });
    mockTransaction.mockResolvedValue({
      plaidItem: { id: "pi-1" },
      accountRecords: [{ id: "fa-1" }],
      syncJob: { id: "sj-1" },
    });

    await POST(makeRequest(validBody));

    expect(mockTransaction).toHaveBeenCalledWith(expect.any(Function));
  });
});
