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

function getInsight(
  flexPct: number,
  fixedCents: number,
  monthlyIncomeCents: number,
): { text: string; color: string } {
  // Warning: fixed > 85% of income
  if (monthlyIncomeCents > 0) {
    const fixedOfIncomePct = Math.round(
      (fixedCents / monthlyIncomeCents) * 100,
    );
    if (fixedOfIncomePct > 85) {
      return {
        text: `Your fixed expenses use ${fixedOfIncomePct}% of your income. Consider reviewing obligations.`,
        color: "warning.main",
      };
    }
  }

  if (flexPct >= 30) {
    return {
      text: `You control ${flexPct}% of your monthly spending.`,
      color: "grey.500",
    };
  }

  if (flexPct >= 15) {
    return {
      text: `Most of your spending is fixed. You control ${flexPct}%.`,
      color: "grey.500",
    };
  }

  return {
    text: "Nearly all your spending is committed to fixed expenses.",
    color: "grey.500",
  };
}

interface ExpenseBreakdownCardProps {
  status: "ready" | "empty";
  fixedCents?: number;
  flexibleCents?: number;
  fixedPct?: number;
  flexiblePct?: number;
  monthlyIncomeCents?: number;
}

export function ExpenseBreakdownCard({
  status,
  fixedCents = 0,
  flexibleCents = 0,
  fixedPct = 0,
  flexiblePct = 0,
  monthlyIncomeCents = 0,
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

  const insight = getInsight(flexiblePct, fixedCents, monthlyIncomeCents);

  return (
    <Card variant="outlined" sx={{ p: 3 }}>
      <Typography
        variant="body2"
        sx={{ fontWeight: 600, color: "grey.900" }}
      >
        Spending Breakdown
      </Typography>

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
        <Box sx={{ width: `${fixedPct}%`, bgcolor: "grey.400" }} />
        <Box sx={{ width: `${flexiblePct}%`, bgcolor: "primary.main" }} />
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
            {formatCurrency(fixedCents)}
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
            {fixedPct}% of spending
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
            {formatCurrency(flexibleCents)}
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
            {flexiblePct}% of spending
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
