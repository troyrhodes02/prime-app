"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import type { Transaction } from "@/hooks/use-transactions";

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

function formatAccountLabel(account: Transaction["account"]): string {
  if (account.type === "CREDIT" && account.mask) {
    return `${account.name} ··${account.mask}`;
  }
  if (account.mask) {
    return `${account.name} ··${account.mask}`;
  }
  return account.name;
}

interface TransactionRowProps {
  transaction: Transaction;
  showBorder: boolean;
}

export function TransactionRow({ transaction, showBorder }: TransactionRowProps) {
  const isIncome = transaction.transaction_type === "INCOME";

  return (
    <Box
      role="listitem"
      sx={{
        display: "flex",
        alignItems: "center",
        px: 2.5,
        py: 1.75,
        borderBottom: showBorder ? "1px solid" : "none",
        borderColor: "grey.100",
        "&:hover": { bgcolor: "grey.50" },
      }}
    >
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
          mr: 2,
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            color: "grey.700",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {transaction.display_name}
        </Typography>
        {transaction.pending && (
          <Chip
            label="Pending"
            size="small"
            sx={{
              ml: 1,
              height: 20,
              fontSize: 11,
              color: "grey.500",
              bgcolor: "grey.100",
              borderRadius: "8px",
            }}
          />
        )}
      </Box>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
          width: 120,
          textAlign: "right",
          color: isIncome ? "success.main" : "grey.900",
        }}
      >
        {isIncome ? "+" : "-"}
        {formatCurrency(transaction.amount_cents)}
      </Typography>
      <Typography
        variant="caption"
        sx={{ color: "grey.500", width: 80, textAlign: "right", ml: 2 }}
      >
        {formatDate(transaction.date)}
      </Typography>
      <Typography
        variant="caption"
        sx={{ color: "grey.500", width: 100, textAlign: "right", ml: 2 }}
      >
        {formatAccountLabel(transaction.account)}
      </Typography>
    </Box>
  );
}
