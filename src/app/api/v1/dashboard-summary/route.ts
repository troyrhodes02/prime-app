import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { computeDashboardSummary } from "@/services/dashboard-summary";
import { DASHBOARD_PERIODS } from "@/lib/dashboard-period";
import { getPeriodLabel } from "@/lib/dashboard-period";

const querySchema = z.object({
  period: z
    .enum(DASHBOARD_PERIODS)
    .default("this_month"),
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

  const parsed = querySchema.safeParse({
    period: request.nextUrl.searchParams.get("period") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", message: "Invalid period parameter" },
      { status: 400 },
    );
  }

  const { period } = parsed.data;
  const result = await computeDashboardSummary(user.id, period);

  return NextResponse.json({
    status: result.status,
    period,
    period_label: getPeriodLabel(period),
    income_cents: result.incomeCents,
    spending_cents: result.spendingCents,
    available_cents: result.availableCents,
    fixed_cents: result.fixedCents,
    flexible_cents: result.flexibleCents,
    fixed_pct: result.fixedPct,
    flexible_pct: result.flexiblePct,
    window_days: result.windowDays,
    transaction_count: result.transactionCount,
  });
}
