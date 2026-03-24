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

  const transactions = await prisma.normalizedTransaction.findMany({
    where: {
      userId: user.id,
      isActive: true,
      pending: false,
    },
    orderBy: [
      { date: "desc" },
      { amountCents: "desc" },
    ],
    take: 5,
    include: {
      account: {
        select: { id: true, name: true, type: true, mask: true },
      },
    },
  });

  return NextResponse.json({
    transactions: transactions.map((t) => ({
      id: t.id,
      amount_cents: t.amountCents,
      iso_currency_code: t.isoCurrencyCode,
      date: t.date.toISOString().split("T")[0],
      display_name: t.displayName,
      transaction_type: t.transactionType,
      pending: t.pending,
      account: {
        id: t.account.id,
        name: t.account.name,
        type: t.account.type,
        mask: t.account.mask,
      },
    })),
  });
}
