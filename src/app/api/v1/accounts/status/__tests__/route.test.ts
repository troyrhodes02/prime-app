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
    plaidItem: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

describe("GET /api/v1/accounts/status", () => {
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

  it("returns empty state when no PlaidItems", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "sb-123" } } });
    mockFindUnique.mockResolvedValue({ id: "user-1" });
    mockFindMany.mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items).toEqual([]);
    expect(body.has_connected_accounts).toBe(false);
    expect(body.has_active_sync).toBe(false);
  });

  it("returns items with latest sync job", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "sb-123" } } });
    mockFindUnique.mockResolvedValue({ id: "user-1" });
    mockFindMany.mockResolvedValue([
      {
        id: "pi-1",
        institutionId: "ins_3",
        institutionName: "Chase",
        status: "ACTIVE",
        lastSyncedAt: new Date("2026-03-22T10:30:00Z"),
        createdAt: new Date(),
        accounts: [
          { id: "fa-1", name: "Checking", type: "DEPOSITORY", mask: "4829", isActive: true },
        ],
        syncJobs: [
          {
            id: "sj-1",
            status: "COMPLETED",
            step: "DONE",
            type: "INITIAL",
            startedAt: new Date("2026-03-22T10:29:55Z"),
            completedAt: new Date("2026-03-22T10:30:00Z"),
            errorMessage: null,
            accountsSynced: 1,
            transactionsSynced: 42,
          },
        ],
      },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.has_connected_accounts).toBe(true);
    expect(body.has_active_sync).toBe(false);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].institution_name).toBe("Chase");
    expect(body.items[0].accounts).toHaveLength(1);
    expect(body.items[0].accounts[0].name).toBe("Checking");
    expect(body.items[0].latest_sync.status).toBe("COMPLETED");
    expect(body.items[0].latest_sync.transactions_synced).toBe(42);
  });

  it("does not expose balance fields in accounts", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "sb-123" } } });
    mockFindUnique.mockResolvedValue({ id: "user-1" });
    mockFindMany.mockResolvedValue([
      {
        id: "pi-1",
        institutionId: "ins_3",
        institutionName: "Chase",
        status: "ACTIVE",
        lastSyncedAt: null,
        createdAt: new Date(),
        accounts: [
          { id: "fa-1", name: "Checking", type: "DEPOSITORY", mask: "4829", isActive: true },
        ],
        syncJobs: [],
      },
    ]);

    const response = await GET();
    const body = await response.json();

    const account = body.items[0].accounts[0];
    expect(account).not.toHaveProperty("currentBalanceCents");
    expect(account).not.toHaveProperty("availableBalanceCents");
    expect(account).not.toHaveProperty("isoCurrencyCode");
  });

  it("sets has_active_sync true when sync is in progress", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "sb-123" } } });
    mockFindUnique.mockResolvedValue({ id: "user-1" });
    mockFindMany.mockResolvedValue([
      {
        id: "pi-1",
        institutionId: "ins_3",
        institutionName: "Chase",
        status: "CONNECTING",
        lastSyncedAt: null,
        createdAt: new Date(),
        accounts: [],
        syncJobs: [
          {
            id: "sj-1",
            status: "IN_PROGRESS",
            step: "SYNCING_BALANCES",
            type: "INITIAL",
            startedAt: new Date("2026-03-22T10:29:55Z"),
            completedAt: null,
            errorMessage: null,
            accountsSynced: 0,
            transactionsSynced: 0,
          },
        ],
      },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.has_active_sync).toBe(true);
  });

  it("sets has_active_sync true when sync is pending", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "sb-123" } } });
    mockFindUnique.mockResolvedValue({ id: "user-1" });
    mockFindMany.mockResolvedValue([
      {
        id: "pi-1",
        institutionId: null,
        institutionName: null,
        status: "CONNECTING",
        lastSyncedAt: null,
        createdAt: new Date(),
        accounts: [],
        syncJobs: [
          {
            id: "sj-1",
            status: "PENDING",
            step: "CONNECTING",
            type: "INITIAL",
            startedAt: new Date(),
            completedAt: null,
            errorMessage: null,
            accountsSynced: 0,
            transactionsSynced: 0,
          },
        ],
      },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.has_active_sync).toBe(true);
  });

  it("includes error_message for failed sync", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "sb-123" } } });
    mockFindUnique.mockResolvedValue({ id: "user-1" });
    mockFindMany.mockResolvedValue([
      {
        id: "pi-1",
        institutionId: "ins_3",
        institutionName: "Chase",
        status: "ERROR",
        lastSyncedAt: null,
        createdAt: new Date(),
        accounts: [],
        syncJobs: [
          {
            id: "sj-1",
            status: "FAILED",
            step: "RETRIEVING_TRANSACTIONS",
            type: "INITIAL",
            startedAt: new Date(),
            completedAt: new Date(),
            errorMessage: "Unknown error",
            accountsSynced: 1,
            transactionsSynced: 0,
          },
        ],
      },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.has_active_sync).toBe(false);
    expect(body.items[0].latest_sync.status).toBe("FAILED");
    expect(body.items[0].latest_sync.error_message).toBe("Unknown error");
  });

  it("returns null latest_sync when no sync jobs exist", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "sb-123" } } });
    mockFindUnique.mockResolvedValue({ id: "user-1" });
    mockFindMany.mockResolvedValue([
      {
        id: "pi-1",
        institutionId: "ins_3",
        institutionName: "Chase",
        status: "CONNECTING",
        lastSyncedAt: null,
        createdAt: new Date(),
        accounts: [],
        syncJobs: [],
      },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.items[0].latest_sync).toBeNull();
  });
});
