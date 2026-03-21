import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  user: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  },
  tenant: {
    create: vi.fn(),
  },
  membership: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { provisionUser, getOrProvisionUser } from "../provisioning";

const makeSupabaseUser = (overrides?: Record<string, unknown>) => ({
  id: "supabase-123",
  email: "user@example.com",
  user_metadata: {
    full_name: "Test User",
    avatar_url: "https://example.com/avatar.jpg",
  },
  ...overrides,
});

describe("provisionUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates User, Tenant, and Membership atomically", async () => {
    const supabaseUser = makeSupabaseUser();

    const mockUser = {
      id: "user-1",
      supabaseId: "supabase-123",
      email: "user@example.com",
      name: "Test User",
      avatarUrl: "https://example.com/avatar.jpg",
    };
    const mockTenant = { id: "tenant-1", name: "user@example.com's workspace" };
    const mockMembership = {
      id: "membership-1",
      userId: "user-1",
      tenantId: "tenant-1",
      role: "OWNER",
    };

    const tx = {
      user: { create: vi.fn().mockResolvedValue(mockUser) },
      tenant: { create: vi.fn().mockResolvedValue(mockTenant) },
      membership: { create: vi.fn().mockResolvedValue(mockMembership) },
    };

    const result = await provisionUser(supabaseUser, tx as unknown as import("@prisma/client").PrismaClient);

    expect(result.user).toEqual(mockUser);
    expect(result.tenant).toEqual(mockTenant);
    expect(result.membership).toEqual(mockMembership);

    expect(tx.user.create).toHaveBeenCalledWith({
      data: {
        supabaseId: "supabase-123",
        email: "user@example.com",
        name: "Test User",
        avatarUrl: "https://example.com/avatar.jpg",
      },
    });

    expect(tx.tenant.create).toHaveBeenCalledWith({
      data: { name: "user@example.com's workspace" },
    });

    expect(tx.membership.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        tenantId: "tenant-1",
        role: "OWNER",
      },
    });
  });

  it("lowercases and trims email", async () => {
    const supabaseUser = makeSupabaseUser({ email: "  User@Example.COM  " });

    const tx = {
      user: { create: vi.fn().mockResolvedValue({ id: "user-1", email: "user@example.com" }) },
      tenant: { create: vi.fn().mockResolvedValue({ id: "tenant-1" }) },
      membership: { create: vi.fn().mockResolvedValue({ id: "membership-1" }) },
    };

    await provisionUser(supabaseUser, tx as unknown as import("@prisma/client").PrismaClient);

    expect(tx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: "user@example.com" }),
      }),
    );
  });

  it("uses null for missing name and avatarUrl", async () => {
    const supabaseUser = makeSupabaseUser({ user_metadata: {} });

    const tx = {
      user: { create: vi.fn().mockResolvedValue({ id: "user-1", email: "user@example.com" }) },
      tenant: { create: vi.fn().mockResolvedValue({ id: "tenant-1" }) },
      membership: { create: vi.fn().mockResolvedValue({ id: "membership-1" }) },
    };

    await provisionUser(supabaseUser, tx as unknown as import("@prisma/client").PrismaClient);

    expect(tx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: null, avatarUrl: null }),
      }),
    );
  });
});

describe("getOrProvisionUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns existing user with isNew false", async () => {
    const existingUser = {
      id: "user-1",
      supabaseId: "supabase-123",
      email: "user@example.com",
    };
    mockPrisma.user.findUnique.mockResolvedValue(existingUser);

    const result = await getOrProvisionUser(makeSupabaseUser());

    expect(result).toEqual({ user: existingUser, isNew: false });
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("provisions new user with isNew true", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const newUser = {
      id: "user-1",
      supabaseId: "supabase-123",
      email: "user@example.com",
    };
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        user: { create: vi.fn().mockResolvedValue(newUser) },
        tenant: { create: vi.fn().mockResolvedValue({ id: "tenant-1" }) },
        membership: { create: vi.fn().mockResolvedValue({ id: "membership-1" }) },
      };
      return fn(tx);
    });

    const result = await getOrProvisionUser(makeSupabaseUser());

    expect(result).toEqual({ user: newUser, isNew: true });
  });

  it("handles P2002 race condition by returning existing user", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const prismaError = new Error("Unique constraint failed");
    Object.assign(prismaError, { code: "P2002" });
    mockPrisma.$transaction.mockRejectedValue(prismaError);

    const existingUser = {
      id: "user-1",
      supabaseId: "supabase-123",
      email: "user@example.com",
    };
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue(existingUser);

    const result = await getOrProvisionUser(makeSupabaseUser());

    expect(result).toEqual({ user: existingUser, isNew: false });
  });

  it("rethrows non-P2002 errors", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.$transaction.mockRejectedValue(new Error("connection lost"));

    await expect(getOrProvisionUser(makeSupabaseUser())).rejects.toThrow("connection lost");
  });
});
