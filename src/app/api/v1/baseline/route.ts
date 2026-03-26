import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { computeBaseline } from "@/services/baseline";

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

  // Check for existing baseline
  const existing = await prisma.financialBaseline.findUnique({
    where: { userId: user.id },
  });

  if (!existing) {
    // No baseline — check if user has any transactions
    const txnCount = await prisma.normalizedTransaction.count({
      where: {
        userId: user.id,
        isActive: true,
        pending: false,
      },
    });

    if (txnCount === 0) {
      return NextResponse.json({ status: "unavailable" });
    }

    // Transactions exist but no baseline yet — compute
    const baseline = await computeBaseline(user.id);
    return NextResponse.json(formatBaseline(baseline));
  }

  // Baseline exists — check staleness
  const newerTxnCount = await prisma.normalizedTransaction.count({
    where: {
      userId: user.id,
      isActive: true,
      OR: [
        { createdAt: { gt: existing.computedAt } },
        { updatedAt: { gt: existing.computedAt } },
      ],
    },
  });

  if (newerTxnCount > 0) {
    // Stale — recompute
    const baseline = await computeBaseline(user.id);
    return NextResponse.json(formatBaseline(baseline));
  }

  // Fresh — return cached
  return NextResponse.json(formatBaseline(existing));
}

function formatBaseline(baseline: {
  status: string;
  monthlyIncomeCents: number;
  monthlySpendingCents: number;
  availableCents: number;
  windowDays: number;
  transactionCount: number;
  computedAt: Date;
}) {
  const status = baseline.status === "READY" ? "ready" : "insufficient_data";

  return {
    status,
    monthly_income_cents: baseline.monthlyIncomeCents,
    monthly_spending_cents: baseline.monthlySpendingCents,
    available_cents: baseline.availableCents,
    window_days: baseline.windowDays,
    transaction_count: baseline.transactionCount,
    computed_at: baseline.computedAt.toISOString(),
  };
}
