import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const querySchema = z.object({
  accountId: z.string().optional(),
  type: z.enum(["all", "income", "expense"]).default("all"),
  days: z.coerce.number().refine((v) => v === 30 || v === 90, {
    message: "days must be 30 or 90",
  }).default(30),
});

export async function GET(request: NextRequest) {
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

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", message: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const { accountId, type, days } = parsed.data;

  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const where: Prisma.NormalizedTransactionWhereInput = {
    userId: user.id,
    isActive: true,
    date: {
      gte: new Date(startOfToday.getTime() - days * 24 * 60 * 60 * 1000),
    },
  };

  if (accountId) {
    where.financialAccountId = accountId;
  }

  if (type === "income") {
    where.transactionType = "INCOME";
  } else if (type === "expense") {
    where.transactionType = "EXPENSE";
  }

  const orderBy = [
    { date: "desc" as const },
    { amountCents: "desc" as const },
  ];

  const [transactions, filteredCount, total] = await Promise.all([
    prisma.normalizedTransaction.findMany({
      where,
      orderBy,
      include: {
        account: {
          select: { id: true, name: true, type: true, mask: true },
        },
      },
    }),
    prisma.normalizedTransaction.count({ where }),
    prisma.normalizedTransaction.count({
      where: { userId: user.id, isActive: true },
    }),
  ]);

  return NextResponse.json({
    transactions: transactions.map((t) => ({
      id: t.id,
      amount_cents: t.amountCents,
      iso_currency_code: t.isoCurrencyCode,
      date: t.date.toISOString().split("T")[0],
      display_name: t.displayName,
      original_name: t.originalName,
      merchant_name: t.merchantName,
      category: t.category,
      transaction_type: t.transactionType,
      pending: t.pending,
      account: {
        id: t.account.id,
        name: t.account.name,
        type: t.account.type,
        mask: t.account.mask,
      },
    })),
    total,
    filtered_count: filteredCount,
  });
}
