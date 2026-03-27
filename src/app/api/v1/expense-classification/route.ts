import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { computeExpenseClassification } from "@/services/classification";

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

  // Check for existing classification
  const existing = await prisma.expenseClassification.findUnique({
    where: { userId: user.id },
  });

  if (!existing) {
    // No classification — check if user has eligible expense transactions
    // Must match the same filters as computeExpenseClassification:
    // 90-day window, active, non-pending, EXPENSE type, excluding INCOME/TRANSFER categories
    const now = new Date();
    const windowStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 90),
    );

    const txnCount = await prisma.normalizedTransaction.count({
      where: {
        userId: user.id,
        isActive: true,
        pending: false,
        transactionType: "EXPENSE",
        date: { gte: windowStart },
        category: { notIn: ["INCOME", "TRANSFER"] },
      },
    });

    if (txnCount === 0) {
      return NextResponse.json({ status: "unavailable" });
    }

    // Transactions exist but no classification yet — compute
    const classification = await computeExpenseClassification(user.id);
    return NextResponse.json(formatClassification(classification));
  }

  // Classification exists — check staleness
  // No transactionType filter: classification depends on INCOME rows for
  // reciprocal transfer detection, and rows may be re-normalized out of EXPENSE.
  // No isActive filter: catches transactions deactivated by re-normalization.
  const newerTxnCount = await prisma.normalizedTransaction.count({
    where: {
      userId: user.id,
      pending: false,
      OR: [
        { createdAt: { gt: existing.computedAt } },
        { updatedAt: { gt: existing.computedAt } },
      ],
    },
  });

  if (newerTxnCount > 0) {
    // Stale — recompute
    const classification = await computeExpenseClassification(user.id);
    return NextResponse.json(formatClassification(classification));
  }

  // Fresh — return cached
  if (existing.status === "INSUFFICIENT_DATA" && existing.transactionCount === 0) {
    return NextResponse.json({ status: "unavailable" });
  }

  return NextResponse.json(formatClassification(existing));
}

function formatClassification(classification: {
  status: string;
  fixedCents: number;
  flexibleCents: number;
  fixedPct: number;
  flexiblePct: number;
  fixedCategories: unknown;
  flexibleCategories: unknown;
  windowDays: number;
  transactionCount: number;
  computedAt: Date;
}) {
  const status = classification.status === "READY" ? "ready" : "insufficient_data";

  return {
    status,
    fixed_cents: classification.fixedCents,
    flexible_cents: classification.flexibleCents,
    fixed_pct: classification.fixedPct,
    flexible_pct: classification.flexiblePct,
    fixed_categories: classification.fixedCategories,
    flexible_categories: classification.flexibleCategories,
    window_days: classification.windowDays,
    transaction_count: classification.transactionCount,
    computed_at: classification.computedAt.toISOString(),
  };
}
