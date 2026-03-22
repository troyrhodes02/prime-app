import { PrismaClient, User, Tenant, Membership } from "@prisma/client";
import { prisma } from "@/lib/prisma";

interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

interface ProvisionResult {
  user: User;
  tenant: Tenant;
  membership: Membership;
}

export async function provisionUser(
  supabaseUser: SupabaseUser,
  tx: PrismaClient,
): Promise<ProvisionResult> {
  const email = supabaseUser.email!.toLowerCase().trim();

  const user = await tx.user.create({
    data: {
      supabaseId: supabaseUser.id,
      email,
      name: supabaseUser.user_metadata?.full_name ?? null,
      avatarUrl: supabaseUser.user_metadata?.avatar_url ?? null,
    },
  });

  const tenant = await tx.tenant.create({
    data: {
      name: `${email}'s workspace`,
    },
  });

  const membership = await tx.membership.create({
    data: {
      userId: user.id,
      tenantId: tenant.id,
      role: "OWNER",
    },
  });

  return { user, tenant, membership };
}

function isPrismaUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  );
}

export async function getOrProvisionUser(
  supabaseUser: SupabaseUser,
): Promise<{ user: User; isNew: boolean }> {
  const existingUser = await prisma.user.findUnique({
    where: { supabaseId: supabaseUser.id },
  });

  if (existingUser) {
    return { user: existingUser, isNew: false };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      return provisionUser(supabaseUser, tx as PrismaClient);
    });
    return { user: result.user, isNew: true };
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      const user = await prisma.user.findUniqueOrThrow({
        where: { supabaseId: supabaseUser.id },
      });
      return { user, isNew: false };
    }
    throw error;
  }
}
