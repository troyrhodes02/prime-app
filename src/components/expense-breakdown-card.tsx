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

interface ExpenseBreakdownCardProps {
  status: "ready" | "empty";
  fixedCents?: number;
  flexibleCents?: number;
  fixedPct?: number;
  flexiblePct?: number;
  periodLabel?: string;
}

export function ExpenseBreakdownCard({
  status,
  fixedCents = 0,
  flexibleCents = 0,
  fixedPct = 0,
  flexiblePct = 0,
  periodLabel,
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

  return (
    <Card variant="outlined" sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, color: "grey.900" }}
        >
          Spending Breakdown
        </Typography>
        {periodLabel && (
          <Typography
            variant="caption"
            sx={{ color: "grey.500", fontWeight: 400 }}
          >
            {periodLabel}
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

      {/* View Budget link */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
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
            "&:hover": { textDecoration: "underline" },
          }}
        >
          View Budget →
        </Typography>
      </Box>
    </Card>
  );
}
