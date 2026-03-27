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

  // Resolve classification — compute if missing or stale, otherwise use cached
  let classification;

  if (!existing) {
    // No classification — check if user has eligible expense transactions
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

    classification = await computeExpenseClassification(user.id);
  } else {
    // Check staleness — no transactionType filter: classification depends on
    // INCOME rows for reciprocal transfer detection, and rows may be
    // re-normalized out of EXPENSE. No isActive filter: catches deactivations.
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
      classification = await computeExpenseClassification(user.id);
    } else {
      // Fresh cached
      if (existing.status === "INSUFFICIENT_DATA" && existing.transactionCount === 0) {
        return NextResponse.json({ status: "unavailable" });
      }
      classification = existing;
    }
  }

  const formatted = formatClassification(classification);

  // For ready classifications, add current month breakdown
  if (formatted.status === "ready") {
    const currentMonth = await queryCurrentMonth(user.id);
    return NextResponse.json({ ...formatted, current_month: currentMonth });
  }

  return NextResponse.json(formatted);
}

// ---------------------------------------------------------------------------
// Current month aggregation
// ---------------------------------------------------------------------------

async function queryCurrentMonth(userId: string) {
  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const daysInMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const daysElapsed = now.getUTCDate();

  const transactions = await prisma.normalizedTransaction.findMany({
    where: {
      userId,
      isActive: true,
      pending: false,
      transactionType: "EXPENSE",
      expenseType: { not: null },
      date: { gte: monthStart },
    },
    select: {
      amountCents: true,
      expenseType: true,
    },
  });

  let fixedCents = 0;
  let flexibleCents = 0;

  for (const t of transactions) {
    if (t.expenseType === "FIXED") {
      fixedCents += t.amountCents;
    } else {
      flexibleCents += t.amountCents;
    }
  }

  const totalCents = fixedCents + flexibleCents;
  const fixedPct =
    totalCents > 0 ? Math.round((fixedCents / totalCents) * 100) : 0;
  const flexiblePct = totalCents > 0 ? 100 - fixedPct : 0;

  return {
    fixed_cents: fixedCents,
    flexible_cents: flexibleCents,
    fixed_pct: fixedPct,
    flexible_pct: flexiblePct,
    transaction_count: transactions.length,
    days_elapsed: daysElapsed,
    days_in_month: daysInMonth,
  };
}

// ---------------------------------------------------------------------------
// Response formatting
// ---------------------------------------------------------------------------

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
