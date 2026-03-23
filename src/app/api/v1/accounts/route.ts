import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  if (!supabaseUser) {
    return NextResponse.json(
      { error: "unauthorized", message: "Authentication required" },
      { status: 401 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { supabaseId: supabaseUser.id },
  });

  if (!user) {
    return NextResponse.json(
      { error: "unauthorized", message: "Authentication required" },
      { status: 401 },
    );
  }

  const financialAccounts = await prisma.financialAccount.findMany({
    where: { userId: user.id },
    include: {
      plaidItem: {
        select: { institutionName: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const accounts = financialAccounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    mask: a.mask,
    is_active: a.isActive,
    institution_name: a.plaidItem.institutionName,
  }));

  return NextResponse.json({
    accounts,
    total: accounts.length,
  });
}
