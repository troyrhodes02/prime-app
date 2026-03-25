import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";

const mockGetUser = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getUser: () => mockGetUser(),
    },
  }),
}));

function makeRequest(path: string) {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

describe("middleware — /transactions protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  });

  it("redirects unauthenticated users from /transactions to /signup", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await middleware(makeRequest("/transactions"));

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe(
      "/signup",
    );
  });

  it("allows authenticated users to access /transactions", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });

    const response = await middleware(makeRequest("/transactions"));

    expect(response.status).toBe(200);
  });
});
