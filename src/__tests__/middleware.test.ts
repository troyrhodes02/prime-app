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

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  });

  describe("authenticated users on auth routes → /dashboard", () => {
    it("redirects /signup to /dashboard", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });

      const response = await middleware(makeRequest("/signup"));

      expect(response.status).toBe(307);
      expect(new URL(response.headers.get("location")!).pathname).toBe("/dashboard");
    });

    it("redirects /login to /dashboard", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });

      const response = await middleware(makeRequest("/login"));

      expect(response.status).toBe(307);
      expect(new URL(response.headers.get("location")!).pathname).toBe("/dashboard");
    });

    it("redirects /verify to /dashboard", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });

      const response = await middleware(makeRequest("/verify"));

      expect(response.status).toBe(307);
      expect(new URL(response.headers.get("location")!).pathname).toBe("/dashboard");
    });
  });

  describe("unauthenticated users on protected routes → /signup", () => {
    it("redirects /dashboard to /signup", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const response = await middleware(makeRequest("/dashboard"));

      expect(response.status).toBe(307);
      expect(new URL(response.headers.get("location")!).pathname).toBe("/signup");
    });

    it("redirects /welcome to /signup", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const response = await middleware(makeRequest("/welcome"));

      expect(response.status).toBe(307);
      expect(new URL(response.headers.get("location")!).pathname).toBe("/signup");
    });

    it("redirects protected /api routes to /signup", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const response = await middleware(makeRequest("/api/accounts"));

      expect(response.status).toBe(307);
      expect(new URL(response.headers.get("location")!).pathname).toBe("/signup");
    });
  });

  describe("allowed through", () => {
    it("allows unauthenticated user on /signup", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const response = await middleware(makeRequest("/signup"));

      expect(response.status).toBe(200);
    });

    it("allows unauthenticated user on /login", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const response = await middleware(makeRequest("/login"));

      expect(response.status).toBe(200);
    });

    it("allows authenticated user on /welcome", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });

      const response = await middleware(makeRequest("/welcome"));

      expect(response.status).toBe(200);
    });

    it("allows authenticated user on /dashboard", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });

      const response = await middleware(makeRequest("/dashboard"));

      expect(response.status).toBe(200);
    });
  });

  describe("auth callback is not protected", () => {
    it("does not redirect /api/auth/callback", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const response = await middleware(makeRequest("/api/auth/callback"));

      expect(response.status).toBe(200);
    });
  });
});
