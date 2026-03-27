"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";

function formatCurrency(cents: number): string {
  const dollars = Math.abs(cents) / 100;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function getMonthLabel(): string {
  const now = new Date();
  return now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function getComparisonInsight(
  currentMonth: {
    flexibleCents: number;
    fixedCents: number;
    daysElapsed: number;
    daysInMonth: number;
    transactionCount: number;
  },
  avgFlexibleCents: number,
  avgFixedCents: number,
  monthlyIncomeCents: number,
): { text: string; color: string } {
  // Warning: fixed > 85% of income (check against current month projected)
  if (monthlyIncomeCents > 0 && currentMonth.daysElapsed >= 7) {
    const projectedFixed =
      (currentMonth.fixedCents / currentMonth.daysElapsed) *
      currentMonth.daysInMonth;
    const fixedOfIncomePct = Math.round(
      (projectedFixed / monthlyIncomeCents) * 100,
    );
    if (fixedOfIncomePct > 85) {
      return {
        text: `Your fixed expenses are on pace to use ${fixedOfIncomePct}% of your income this month. Consider reviewing obligations.`,
        color: "warning.main",
      };
    }
  }

  // Too early in month or no transactions for pace comparison
  if (currentMonth.daysElapsed < 7 || currentMonth.transactionCount === 0) {
    return {
      text: `Spending so far in ${getMonthLabel()}.`,
      color: "grey.500",
    };
  }

  // Project current month flexible to full month and compare to 90-day average
  if (avgFlexibleCents > 0) {
    const projectedFlexible =
      (currentMonth.flexibleCents / currentMonth.daysElapsed) *
      currentMonth.daysInMonth;
    const pctDiff = Math.round(
      ((projectedFlexible - avgFlexibleCents) / avgFlexibleCents) * 100,
    );

    if (pctDiff >= 10) {
      return {
        text: `Flexible spending is trending ${pctDiff}% above your monthly average.`,
        color: "grey.500",
      };
    }
    if (pctDiff <= -10) {
      return {
        text: `Flexible spending is trending ${Math.abs(pctDiff)}% below your monthly average.`,
        color: "grey.500",
      };
    }
  }

  return {
    text: "Your spending this month is in line with your usual pattern.",
    color: "grey.500",
  };
}

interface CurrentMonthData {
  fixedCents: number;
  flexibleCents: number;
  fixedPct: number;
  flexiblePct: number;
  transactionCount: number;
  daysElapsed: number;
  daysInMonth: number;
}

interface ExpenseBreakdownCardProps {
  status: "ready" | "empty";
  fixedCents?: number;
  flexibleCents?: number;
  fixedPct?: number;
  flexiblePct?: number;
  monthlyIncomeCents?: number;
  currentMonth?: CurrentMonthData;
}

export function ExpenseBreakdownCard({
  status,
  fixedCents = 0,
  flexibleCents = 0,
  fixedPct = 0,
  flexiblePct = 0,
  monthlyIncomeCents = 0,
  currentMonth,
}: ExpenseBreakdownCardProps) {
  if (status === "empty") {
    return (
      <Card variant="outlined" sx={{ p: 3 }}>
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, color: "grey.900" }}
        >
          Spending Breakdown
        </Typography>

        {/* Empty ratio bar */}
        <Box
          sx={{
            mt: 2,
            height: 8,
            borderRadius: 1,
            overflow: "hidden",
            bgcolor: "grey.100",
          }}
        />

        {/* Empty amounts */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mt: 2,
          }}
        >
          <Box>
            <Typography
              variant="body2"
              sx={{ fontWeight: 500, color: "grey.500" }}
            >
              Fixed Expenses
            </Typography>
            <Typography
              variant="h6"
              sx={{ fontWeight: 600, color: "grey.300", mt: 0.5 }}
            >
              —
            </Typography>
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <Typography
              variant="body2"
              sx={{ fontWeight: 500, color: "grey.500" }}
            >
              Flexible Spending
            </Typography>
            <Typography
              variant="h6"
              sx={{ fontWeight: 600, color: "grey.300", mt: 0.5 }}
            >
              —
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography
          variant="body2"
          sx={{ fontSize: 13, color: "grey.500", lineHeight: 1.6 }}
        >
          P.R.I.M.E. will classify your spending once enough transaction
          history is available.
        </Typography>
      </Card>
    );
  }

  // Determine display values: current month if available, otherwise 90-day average
  const hasCurrentMonth = currentMonth && currentMonth.transactionCount > 0;

  const displayFixedCents = hasCurrentMonth ? currentMonth.fixedCents : fixedCents;
  const displayFlexibleCents = hasCurrentMonth ? currentMonth.flexibleCents : flexibleCents;
  const displayFixedPct = hasCurrentMonth ? currentMonth.fixedPct : fixedPct;
  const displayFlexiblePct = hasCurrentMonth ? currentMonth.flexiblePct : flexiblePct;

  const insight = hasCurrentMonth
    ? getComparisonInsight(
        currentMonth,
        flexibleCents,
        fixedCents,
        monthlyIncomeCents,
      )
    : {
        text: `Based on your spending over the last ${Math.round(fixedCents + flexibleCents > 0 ? 90 : 0)} days.`,
        color: "grey.500",
      };

  return (
    <Card variant="outlined" sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, color: "grey.900" }}
        >
          Spending Breakdown
        </Typography>
        {hasCurrentMonth && (
          <Typography
            variant="caption"
            sx={{ color: "grey.500", fontWeight: 400 }}
          >
            {getMonthLabel()}
          </Typography>
        )}
      </Box>

      {/* Ratio bar */}
      <Box
        sx={{
          display: "flex",
          mt: 2,
          height: 8,
          borderRadius: 1,
          overflow: "hidden",
        }}
      >
        <Box sx={{ width: `${displayFixedPct}%`, bgcolor: "grey.400" }} />
        <Box sx={{ width: `${displayFlexiblePct}%`, bgcolor: "primary.main" }} />
      </Box>

      {/* Amounts */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mt: 2,
        }}
      >
        <Box>
          <Typography
            variant="body2"
            sx={{ fontWeight: 500, color: "grey.500" }}
          >
            Fixed Expenses
          </Typography>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              color: "grey.700",
              mt: 0.5,
              fontSize: 22,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatCurrency(displayFixedCents)}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontSize: 13,
              fontWeight: 500,
              color: "grey.500",
              mt: 0.25,
            }}
          >
            {displayFixedPct}% of spending
          </Typography>
        </Box>
        <Box sx={{ textAlign: "right" }}>
          <Typography
            variant="body2"
            sx={{ fontWeight: 500, color: "grey.500" }}
          >
            Flexible Spending
          </Typography>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: "primary.main",
              mt: 0.5,
              fontSize: 22,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatCurrency(displayFlexibleCents)}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontSize: 13,
              fontWeight: 500,
              color: "grey.500",
              mt: 0.25,
            }}
          >
            {displayFlexiblePct}% of spending
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Insight + View Budget link */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography
          variant="body2"
          sx={{ fontSize: 13, color: insight.color, lineHeight: 1.6 }}
        >
          {insight.text}
        </Typography>
        <Typography
          component={Link}
          href="/budget"
          variant="body2"
          sx={{
            fontSize: 13,
            fontWeight: 500,
            color: "primary.main",
            textDecoration: "none",
            whiteSpace: "nowrap",
            ml: 2,
            "&:hover": { textDecoration: "underline" },
          }}
        >
          View Budget →
        </Typography>
      </Box>
    </Card>
  );
}
