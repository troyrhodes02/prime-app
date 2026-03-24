"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import type { RecentTransaction } from "@/hooks/use-recent-transactions";

function formatCurrency(cents: number): string {
  return (Math.abs(cents) / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const now = new Date();
  const monthName = date.toLocaleDateString("en-US", { month: "short" });
  if (date.getFullYear() !== now.getFullYear()) {
    return `${monthName} ${day}, ${year}`;
  }
  return `${monthName} ${day}`;
}

function formatAccountLabel(account: RecentTransaction["account"]): string {
  if (account.mask) {
    return `${account.name} ··${account.mask}`;
  }
  return account.name;
}

interface RecentActivityCardProps {
  transactions: RecentTransaction[];
}

export function RecentActivityCard({ transactions }: RecentActivityCardProps) {
  return (
    <Card variant="outlined" sx={{ overflow: "hidden" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          px: 2.5,
          py: 2,
          borderBottom: "1px solid",
          borderColor: "grey.100",
        }}
      >
        <Typography
          variant="h6"
          sx={{ fontSize: 16, fontWeight: 600, color: "grey.900" }}
        >
          Recent Activity
        </Typography>
        <Typography
          component={Link}
          href="/transactions"
          variant="body2"
          sx={{
            fontWeight: 500,
            color: "primary.main",
            textDecoration: "none",
            "&:hover": { textDecoration: "underline" },
          }}
        >
          View All
        </Typography>
      </Box>

      {transactions.map((txn, i) => {
        const isIncome = txn.transaction_type === "INCOME";
        return (
          <Box
            key={txn.id}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 2.5,
              py: 1.5,
              borderBottom:
                i < transactions.length - 1 ? "1px solid" : "none",
              borderColor: "grey.100",
              "&:hover": { bgcolor: "grey.50" },
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
                color: "grey.700",
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                mr: 2,
              }}
            >
              {txn.display_name}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  fontVariantNumeric: "tabular-nums",
                  color: isIncome ? "success.main" : "grey.900",
                }}
              >
                {isIncome ? "+" : "-"}
                {formatCurrency(txn.amount_cents)}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: "grey.500", whiteSpace: "nowrap" }}
              >
                {formatDate(txn.date)} · {formatAccountLabel(txn.account)}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Card>
  );
}
