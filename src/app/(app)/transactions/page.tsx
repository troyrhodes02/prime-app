"use client";

import { Suspense, useCallback } from "react";
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

const VALID_TYPES = new Set(["all", "income", "expense"]);
const VALID_DAYS = new Set([30, 90]);

function TransactionsSkeleton() {
  return (
    <Card variant="outlined" sx={{ overflow: "hidden" }}>
      <Box sx={{ px: 2.5, py: 1.5, bgcolor: "grey.50", borderBottom: "1px solid", borderColor: "grey.200" }}>
        <Skeleton variant="rectangular" sx={{ borderRadius: 1, width: { xs: "100%", sm: 400 }, height: 32 }} />
      </Box>
      {Array.from({ length: 8 }).map((_, i) => (
        <Box
          key={i}
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "center" },
            gap: { xs: 0.5, sm: 0 },
            px: 2.5,
            py: 1.75,
            borderBottom: i < 7 ? "1px solid" : "none",
            borderColor: "grey.100",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", flex: 1 }}>
            <Skeleton sx={{ width: { xs: "60%", sm: "40%" }, height: 20 }} />
            <Box sx={{ flex: 1 }} />
            <Skeleton sx={{ width: 80, height: 20 }} />
          </Box>
          <Box sx={{ display: { xs: "flex", sm: "contents" }, justifyContent: "flex-end", gap: 1 }}>
            <Skeleton sx={{ width: 60, height: 16, ml: { xs: 0, sm: 2 } }} />
            <Skeleton sx={{ width: 80, height: 16, ml: { xs: 0, sm: 2 } }} />
          </Box>
        </Box>
      ))}
    </Card>
  );
}

function TransactionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const accountId = searchParams.get("accountId") ?? "all";
  const rawType = searchParams.get("type") ?? "all";
  const type = (VALID_TYPES.has(rawType) ? rawType : "all") as "all" | "income" | "expense";
  const rawDays = Number(searchParams.get("days")) || 30;
  const days = (VALID_DAYS.has(rawDays) ? rawDays : 30) as 30 | 90;

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

  if (!isLoading && !hasConnectedAccounts) {
    return <TransactionsEmptyState variant="no-accounts" />;
  }

  if (!isLoading && hasConnectedAccounts && data && data.total === 0) {
    return <TransactionsEmptyState variant="processing" />;
  }

  return (
    <>
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
    </>
  );
}

export default function TransactionsPage() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h5" sx={{ fontWeight: 600, color: "grey.900" }}>
        Transactions
      </Typography>

      <Suspense fallback={<TransactionsSkeleton />}>
        <TransactionsContent />
      </Suspense>
    </Box>
  );
}
