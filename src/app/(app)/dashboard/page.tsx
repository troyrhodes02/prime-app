"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import LightbulbOutlined from "@mui/icons-material/LightbulbOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import { toast } from "sonner";
import { EmptyStateCard } from "@/components/empty-state-card";
import { RecentActivityCard } from "@/components/recent-activity-card";
import { ConnectionCard } from "@/components/connection-card";
import { SyncProgressCard } from "@/components/sync-progress-card";
import { ActivationCard } from "@/components/activation-card";
import { ConnectedAccountsCard } from "@/components/connected-accounts-card";
import { WelcomeModal } from "@/components/welcome-modal";
import { BaselineCard } from "@/components/baseline-card";
import { ExpenseBreakdownCard } from "@/components/expense-breakdown-card";
import { DashboardPeriodSelector } from "@/components/dashboard-period-selector";
import { useAccountStatus } from "@/hooks/use-account-status";
import { useRecentTransactions } from "@/hooks/use-recent-transactions";
import { useDashboardSummary } from "@/hooks/use-dashboard-summary";
import type { DashboardPeriod } from "@/lib/dashboard-period";

function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function SummaryCard({
  label,
  amount,
  amountColor,
  prefix,
  note,
}: {
  label: string;
  amount?: number | null;
  amountColor?: string;
  prefix?: string;
  note?: string;
}) {
  const hasValue = amount != null;

  return (
    <Card variant="outlined" sx={{ p: 2.5 }}>
      <Typography
        variant="caption"
        sx={{
          color: "grey.500",
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </Typography>
      <Typography
        variant={hasValue ? "h5" : "h6"}
        sx={{
          fontWeight: 600,
          color: hasValue ? amountColor : "grey.300",
          mt: 0.5,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {hasValue ? `${prefix}${formatCurrency(amount)}` : "—"}
      </Typography>
      {hasValue && note && (
        <Typography
          variant="caption"
          sx={{ color: "grey.500", mt: 0.5, display: "block" }}
        >
          {note}
        </Typography>
      )}
    </Card>
  );
}

function WelcomeModalController() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(searchParams.get("welcome") === "true");

  function handleWelcomeClose() {
    setOpen(false);
    router.replace("/dashboard");
  }

  return <WelcomeModal open={open} onClose={handleWelcomeClose} />;
}

type DashboardState =
  | "pre_connection"
  | "syncing"
  | "activation_complete"
  | "connected";

export default function DashboardPage() {
  const [period, setPeriod] = useState<DashboardPeriod>("this_month");

  const { data: accountStatus, mutate } = useAccountStatus();
  const {
    data: recentData,
    isLoading: recentLoading,
    mutate: recentMutate,
  } = useRecentTransactions();
  const { data: summary, mutate: summaryMutate } = useDashboardSummary(period);

  const firstItem = accountStatus?.items[0] ?? null;
  const hasConnectedAccounts = accountStatus?.has_connected_accounts ?? false;
  const hasActiveSync = accountStatus?.has_active_sync ?? false;
  const latestSyncStatus = firstItem?.latest_sync?.status ?? null;

  // Track whether we've seen an active sync in this session.
  // When sync transitions from active → completed, show activation_complete.
  const wasActivelySyncing = useRef(false);
  const [showActivation, setShowActivation] = useState(false);

  useEffect(() => {
    if (hasActiveSync) {
      wasActivelySyncing.current = true;
    } else if (
      wasActivelySyncing.current &&
      hasConnectedAccounts &&
      latestSyncStatus === "COMPLETED"
    ) {
      wasActivelySyncing.current = false;
      setShowActivation(true);
    }
  }, [hasActiveSync, hasConnectedAccounts, latestSyncStatus]);

  // Revalidate data when sync completes.
  const prevSyncActive = useRef(false);
  useEffect(() => {
    if (hasActiveSync) {
      prevSyncActive.current = true;
    } else if (prevSyncActive.current) {
      prevSyncActive.current = false;
      recentMutate();
      summaryMutate();
    }
  }, [hasActiveSync, recentMutate, summaryMutate]);

  const dashboardState: DashboardState = (() => {
    if (!hasConnectedAccounts) return "pre_connection";
    if (hasActiveSync) return "syncing";
    if (latestSyncStatus === "FAILED") return "syncing";
    if (showActivation) return "activation_complete";
    return "connected";
  })();

  const summaryReady =
    dashboardState === "connected" && summary?.status === "ready";

  const isThisMonth = period === "this_month";
  const summaryNote = isThisMonth
    ? `Actual for ${summary?.period_label ?? "this month"}`
    : "Estimated monthly rate";

  const handlePlaidSuccess = useCallback(
    async (publicToken: string, metadata: Record<string, unknown>) => {
      setShowActivation(false);

      try {
        const res = await fetch("/api/v1/plaid/exchange-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            public_token: publicToken,
            institution: metadata.institution,
            accounts: (
              metadata.accounts as Array<Record<string, unknown>>
            )?.map((a) => ({
              id: a.id,
              name: a.name,
              official_name: a.official_name ?? null,
              type: a.type,
              subtype: a.subtype ?? null,
              mask: a.mask ?? null,
            })),
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Failed to connect accounts");
        }

        mutate();
      } catch {
        toast.error("Failed to connect accounts. Please try again.");
      }
    },
    [mutate],
  );

  const handleRetry = useCallback(async () => {
    if (!firstItem) return;
    toast("Retrying sync…", { duration: 3000 });
    try {
      const res = await fetch(`/api/v1/plaid/sync/${firstItem.id}/retry`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Retry failed");
      }
      toast("Sync retry started.", { duration: 3000 });
      mutate();
    } catch {
      toast.error("Something went wrong syncing your accounts. Try again.", {
        duration: 5000,
      });
    }
  }, [firstItem, mutate]);

  function renderMainCard() {
    if (dashboardState === "syncing" && firstItem?.latest_sync) {
      return (
        <SyncProgressCard
          institutionName={firstItem.institution_name}
          accountCount={firstItem.accounts.length}
          syncStatus={firstItem.latest_sync.status}
          syncStep={firstItem.latest_sync.step}
          startedAt={firstItem.latest_sync.started_at}
          onRetry={handleRetry}
        />
      );
    }

    if (dashboardState === "activation_complete" && accountStatus) {
      return (
        <ActivationCard
          items={accountStatus.items}
          onPlaidSuccess={handlePlaidSuccess}
          onDismiss={() => setShowActivation(false)}
        />
      );
    }

    if (dashboardState === "connected" && accountStatus) {
      return (
        <ConnectedAccountsCard
          items={accountStatus.items}
          onPlaidSuccess={handlePlaidSuccess}
        />
      );
    }

    return <ConnectionCard onSuccess={handlePlaidSuccess} />;
  }

  const showBaselineCard =
    dashboardState === "connected" && summary != null;

  const showBreakdownCard =
    summaryReady &&
    (summary.fixed_cents > 0 || summary.flexible_cents > 0);

  return (
    <>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {dashboardState === "connected" && (
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <DashboardPeriodSelector value={period} onChange={setPeriod} />
          </Box>
        )}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: 2,
          }}
        >
          <SummaryCard
            label="Monthly Income"
            amount={summaryReady ? summary.income_cents : null}
            amountColor="success.main"
            prefix="+"
            note={summaryNote}
          />
          <SummaryCard
            label="Monthly Spending"
            amount={summaryReady ? summary.spending_cents : null}
            amountColor="error.main"
            prefix="-"
            note={summaryNote}
          />
          <SummaryCard label="Upcoming Bills" />
        </Box>

        {showBaselineCard && (
          <BaselineCard
            status={summary.status === "ready" ? "ready" : "insufficient_data"}
            availableCents={
              summary.status === "ready" ? summary.available_cents : 0
            }
            windowDays={summary.window_days}
            periodLabel={summary.period_label}
          />
        )}

        {showBreakdownCard ? (
          <ExpenseBreakdownCard
            status="ready"
            fixedCents={summary.fixed_cents}
            flexibleCents={summary.flexible_cents}
            fixedPct={summary.fixed_pct}
            flexiblePct={summary.flexible_pct}
            periodLabel={summary.period_label}
          />
        ) : (
          summaryReady && <ExpenseBreakdownCard status="empty" />
        )}

        {renderMainCard()}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 2,
          }}
        >
          {!recentLoading && recentData && recentData.transactions.length > 0 ? (
            <RecentActivityCard transactions={recentData.transactions} />
          ) : (
            <EmptyStateCard
              title="Recent Activity"
              icon={ReceiptLongOutlined}
              heading="No transactions yet"
              description="Transactions will appear here once your accounts are connected."
            />
          )}
          <EmptyStateCard
            title="Insights"
            icon={LightbulbOutlined}
            heading="No insights yet"
            description="Insights will appear here as P.R.I.M.E. learns your finances."
          />
        </Box>
      </Box>

      <Suspense fallback={null}>
        <WelcomeModalController />
      </Suspense>
    </>
  );
}
