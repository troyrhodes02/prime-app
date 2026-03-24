"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { TransactionRow } from "./transaction-row";
import type { Transaction } from "@/hooks/use-transactions";

interface TransactionListProps {
  transactions: Transaction[];
  filteredCount: number;
  total: number;
}

export function TransactionList({
  transactions,
  filteredCount,
  total,
}: TransactionListProps) {
  return (
    <>
      <Box role="list" aria-label="Transactions">
        {transactions.map((txn, i) => (
          <TransactionRow
            key={txn.id}
            transaction={txn}
            showBorder={i < transactions.length - 1}
          />
        ))}
      </Box>

      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          borderTop: "1px solid",
          borderColor: "grey.200",
          bgcolor: "grey.50",
        }}
      >
        <Typography variant="caption" sx={{ color: "grey.500" }}>
          Showing {filteredCount} of {total} transactions
        </Typography>
      </Box>
    </>
  );
}
