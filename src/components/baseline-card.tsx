"use client";

import Card from "@mui/material/Card";
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

interface BaselineCardProps {
  status: "ready" | "insufficient_data";
  availableCents: number;
  windowDays: number;
  periodLabel?: string;
}

export function BaselineCard({ status, availableCents, windowDays, periodLabel }: BaselineCardProps) {
  if (status === "insufficient_data") {
    return (
      <Card variant="outlined" sx={{ py: 4, px: 3, textAlign: "center" }}>
        <Typography variant="body2" sx={{ fontWeight: 500, color: "grey.500" }}>
          Available Monthly
        </Typography>
        <Typography
          variant="h4"
          sx={{ fontWeight: 700, color: "grey.300", mt: 0.5 }}
        >
          —
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "grey.500",
            fontSize: 13,
            mt: 1,
            maxWidth: 360,
            mx: "auto",
            lineHeight: 1.6,
          }}
        >
          P.R.I.M.E. needs more transaction history to estimate your available
          money. Check back soon.
        </Typography>
      </Card>
    );
  }

  const isNegative = availableCents < 0;
  const isExact = periodLabel === "This Month";

  const explanation = isNegative
    ? isExact
      ? `Your spending has exceeded your income so far this month.`
      : `Your recent spending has exceeded your income. This is based on the last ${windowDays} days of activity.`
    : isExact
      ? `Income minus spending for ${periodLabel ?? "this month"}.`
      : `Based on your recent income and spending patterns over the last ${windowDays} days.`;

  const prefix = isNegative ? "-" : isExact ? "" : "~";

  return (
    <Card variant="outlined" sx={{ py: 4, px: 3, textAlign: "center" }}>
      <Typography variant="body2" sx={{ fontWeight: 500, color: "grey.500" }}>
        Available Monthly
      </Typography>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          color: isNegative ? "error.main" : "primary.main",
          mt: 0.5,
        }}
      >
        {prefix}
        {formatCurrency(availableCents)}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: "grey.500",
          fontSize: 13,
          mt: 1,
          maxWidth: 360,
          mx: "auto",
          lineHeight: 1.6,
        }}
      >
        {explanation}
      </Typography>
    </Card>
  );
}
