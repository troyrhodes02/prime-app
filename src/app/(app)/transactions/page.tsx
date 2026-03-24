"use client";

import { useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import AutoFixHighOutlined from "@mui/icons-material/AutoFixHighOutlined";
import { useTransactions } from "@/hooks/use-transactions";
import { useAccountStatus } from "@/hooks/use-account-status";
import { TransactionFilterBar } from "@/components/transaction-filter-bar";
import { TransactionList } from "@/components/transaction-list";
import { TransactionsEmptyState } from "@/components/transactions-empty-state";

function TransactionsSkeleton() {
  return (
    <Card variant="outlined" sx={{ overflow: "hidden" }}>
      <Box sx={{ px: 2.5, py: 1.5, bgcolor: "grey.50", borderBottom: "1px solid", borderColor: "grey.200" }}>
        <Skeleton variant="rectangular" width={400} height={32} sx={{ borderRadius: 1 }} />
      </Box>
      {Array.from({ length: 8 }).map((_, i) => (
        <Box
          key={i}
          sx={{
            display: "flex",
            alignItems: "center",
            px: 2.5,
            py: 1.75,
            borderBottom: i < 7 ? "1px solid" : "none",
            borderColor: "grey.100",
          }}
        >
          <Skeleton width="40%" height={20} />
          <Box sx={{ flex: 1 }} />
          <Skeleton width={80} height={20} />
          <Skeleton width={60} height={16} sx={{ ml: 2 }} />
          <Skeleton width={80} height={16} sx={{ ml: 2 }} />
        </Box>
      ))}
    </Card>
  );
}

export default function TransactionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const accountId = searchParams.get("accountId") ?? "all";
  const type = (searchParams.get("type") ?? "all") as "all" | "income" | "expense";
  const days = (Number(searchParams.get("days")) || 30) as 30 | 90;

  const { data: accountStatus, isLoading: accountsLoading } = useAccountStatus();
  const { data, isLoading: transactionsLoading } = useTransactions({
    accountId: accountId !== "all" ? accountId : undefined,
    type,
    days,
  });

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all" || value === "30") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      const qs = params.toString();
      router.replace(`/transactions${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [searchParams, router],
  );

  const hasConnectedAccounts = accountStatus?.has_connected_accounts ?? false;
  const isLoading = accountsLoading || transactionsLoading;

  // Determine empty state variant
  if (!isLoading && !hasConnectedAccounts) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, color: "grey.900" }}>
          Transactions
        </Typography>
        <TransactionsEmptyState variant="no-accounts" />
      </Box>
    );
  }

  if (!isLoading && hasConnectedAccounts && data && data.total === 0) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, color: "grey.900" }}>
          Transactions
        </Typography>
        <TransactionsEmptyState variant="processing" />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h5" sx={{ fontWeight: 600, color: "grey.900" }}>
        Transactions
      </Typography>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <AutoFixHighOutlined sx={{ fontSize: 16, color: "grey.400" }} />
        <Typography variant="caption" sx={{ color: "grey.500" }}>
          Transactions are automatically cleaned and organized by P.R.I.M.E.
        </Typography>
      </Box>

      {isLoading ? (
        <TransactionsSkeleton />
      ) : (
        <Card variant="outlined" sx={{ overflow: "hidden" }}>
          <TransactionFilterBar
            accountId={accountId}
            type={type}
            days={days}
            accounts={accountStatus?.items ?? []}
            onAccountChange={(v) => updateFilter("accountId", v)}
            onTypeChange={(v) => updateFilter("type", v)}
            onDaysChange={(v) => updateFilter("days", String(v))}
          />

          {data && data.transactions.length > 0 ? (
            <TransactionList
              transactions={data.transactions}
              filteredCount={data.filtered_count}
              total={data.total}
            />
          ) : (
            <TransactionsEmptyState variant="no-results" />
          )}
        </Card>
      )}
    </Box>
  );
}
