import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";
import { NextRequest } from "next/server";

const mockExchangeCodeForSession = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      exchangeCodeForSession: (...args: unknown[]) => mockExchangeCodeForSession(...args),
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
  }),
}));

const mockGetOrProvisionUser = vi.fn();

vi.mock("@/services/provisioning", () => ({
  getOrProvisionUser: (...args: unknown[]) => mockGetOrProvisionUser(...args),
}));

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost:3000/api/auth/callback");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

describe("GET /api/auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /signup?error=missing_code when no code param", async () => {
    const response = await GET(makeRequest());

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/signup");
    expect(new URL(response.headers.get("location")!).searchParams.get("error")).toBe("missing_code");
  });

  it("redirects to /signup?error=auth_failed when code exchange fails", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: new Error("invalid code") });

    const response = await GET(makeRequest({ code: "bad-code" }));

    expect(new URL(response.headers.get("location")!).pathname).toBe("/signup");
    expect(new URL(response.headers.get("location")!).searchParams.get("error")).toBe("auth_failed");
  });

  it("redirects to /welcome for new users", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({
      data: { user: { id: "sb-123", email: "user@example.com" } },
    });
    mockGetOrProvisionUser.mockResolvedValue({
      user: { id: "user-1" },
      isNew: true,
    });

    const response = await GET(makeRequest({ code: "valid-code" }));

    expect(new URL(response.headers.get("location")!).pathname).toBe("/welcome");
  });

  it("redirects to /dashboard for existing users", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({
      data: { user: { id: "sb-123", email: "user@example.com" } },
    });
    mockGetOrProvisionUser.mockResolvedValue({
      user: { id: "user-1" },
      isNew: false,
    });

    const response = await GET(makeRequest({ code: "valid-code" }));

    expect(new URL(response.headers.get("location")!).pathname).toBe("/dashboard");
  });

  it("redirects to next param for existing users when provided", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({
      data: { user: { id: "sb-123", email: "user@example.com" } },
    });
    mockGetOrProvisionUser.mockResolvedValue({
      user: { id: "user-1" },
      isNew: false,
    });

    const response = await GET(makeRequest({ code: "valid-code", next: "/settings" }));

    expect(new URL(response.headers.get("location")!).pathname).toBe("/settings");
  });

  it("redirects to /signup?error=auth_failed when getUser returns null", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await GET(makeRequest({ code: "valid-code" }));

    expect(new URL(response.headers.get("location")!).pathname).toBe("/signup");
    expect(new URL(response.headers.get("location")!).searchParams.get("error")).toBe("auth_failed");
  });

  it("redirects to /signup?error=provisioning_failed on provisioning error", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({
      data: { user: { id: "sb-123", email: "user@example.com" } },
    });
    mockGetOrProvisionUser.mockRejectedValue(new Error("DB down"));

    const response = await GET(makeRequest({ code: "valid-code" }));

    expect(new URL(response.headers.get("location")!).pathname).toBe("/signup");
    expect(new URL(response.headers.get("location")!).searchParams.get("error")).toBe("provisioning_failed");
  });

  describe("OTP source flow", () => {
    it("skips code exchange when source=otp and provisions user", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "sb-123", email: "user@example.com" } },
      });
      mockGetOrProvisionUser.mockResolvedValue({
        user: { id: "user-1" },
        isNew: true,
      });

      const response = await GET(makeRequest({ source: "otp" }));

      expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
      expect(new URL(response.headers.get("location")!).pathname).toBe("/welcome");
    });

    it("redirects to /dashboard for existing user via OTP", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "sb-123", email: "user@example.com" } },
      });
      mockGetOrProvisionUser.mockResolvedValue({
        user: { id: "user-1" },
        isNew: false,
      });

      const response = await GET(makeRequest({ source: "otp" }));

      expect(new URL(response.headers.get("location")!).pathname).toBe("/dashboard");
    });

    it("redirects to /signup?error=auth_failed when OTP session has no user", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const response = await GET(makeRequest({ source: "otp" }));

      expect(new URL(response.headers.get("location")!).pathname).toBe("/signup");
      expect(new URL(response.headers.get("location")!).searchParams.get("error")).toBe("auth_failed");
    });
  });
});
