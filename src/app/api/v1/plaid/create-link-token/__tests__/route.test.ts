import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";

const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
  }),
}));

const mockFindUnique = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

const mockLinkTokenCreate = vi.fn();

vi.mock("@/lib/plaid", () => ({
  plaidClient: {
    linkTokenCreate: (...args: unknown[]) => mockLinkTokenCreate(...args),
  },
}));

describe("POST /api/v1/plaid/create-link-token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no supabase session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await POST();

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("unauthorized");
  });

  it("returns 401 when supabase user has no matching prisma user", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "sb-123" } },
    });
    mockFindUnique.mockResolvedValue(null);

    const response = await POST();

    expect(response.status).toBe(401);
  });

  it("returns link_token and expiration on success", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "sb-123" } },
    });
    mockFindUnique.mockResolvedValue({ id: "user-1" });
    mockLinkTokenCreate.mockResolvedValue({
      data: {
        link_token: "link-sandbox-abc123",
        expiration: "2026-03-22T12:00:00Z",
      },
    });

    const response = await POST();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.link_token).toBe("link-sandbox-abc123");
    expect(body.expiration).toBe("2026-03-22T12:00:00Z");
  });

  it("passes correct params to linkTokenCreate", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "sb-123" } },
    });
    mockFindUnique.mockResolvedValue({ id: "user-1" });
    mockLinkTokenCreate.mockResolvedValue({
      data: { link_token: "link-sandbox-abc", expiration: "2026-03-22T12:00:00Z" },
    });

    await POST();

    expect(mockLinkTokenCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        user: { client_user_id: "user-1" },
        client_name: "P.R.I.M.E.",
        language: "en",
      }),
    );
  });

  it("includes redirect_uri when PLAID_REDIRECT_URI is set", async () => {
    process.env.PLAID_REDIRECT_URI = "https://app.example.com/oauth";
    mockGetUser.mockResolvedValue({
      data: { user: { id: "sb-123" } },
    });
    mockFindUnique.mockResolvedValue({ id: "user-1" });
    mockLinkTokenCreate.mockResolvedValue({
      data: { link_token: "link-sandbox-abc", expiration: "2026-03-22T12:00:00Z" },
    });

    await POST();

    expect(mockLinkTokenCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        redirect_uri: "https://app.example.com/oauth",
      }),
    );
    delete process.env.PLAID_REDIRECT_URI;
  });

  it("omits redirect_uri when PLAID_REDIRECT_URI is not set", async () => {
    delete process.env.PLAID_REDIRECT_URI;
    mockGetUser.mockResolvedValue({
      data: { user: { id: "sb-123" } },
    });
    mockFindUnique.mockResolvedValue({ id: "user-1" });
    mockLinkTokenCreate.mockResolvedValue({
      data: { link_token: "link-sandbox-abc", expiration: "2026-03-22T12:00:00Z" },
    });

    await POST();

    expect(mockLinkTokenCreate).toHaveBeenCalledWith(
      expect.not.objectContaining({
        redirect_uri: expect.anything(),
      }),
    );
  });

  it("returns 502 when Plaid API fails", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "sb-123" } },
    });
    mockFindUnique.mockResolvedValue({ id: "user-1" });
    mockLinkTokenCreate.mockRejectedValue(new Error("Plaid timeout"));

    const response = await POST();

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error).toBe("plaid_unavailable");
  });
});
