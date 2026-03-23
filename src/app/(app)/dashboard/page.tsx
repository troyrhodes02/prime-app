"use client";

import { Suspense, useCallback, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import LightbulbOutlined from "@mui/icons-material/LightbulbOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import { toast } from "sonner";
import { EmptyStateCard } from "@/components/empty-state-card";
import { ConnectionCard } from "@/components/connection-card";
import { SyncProgressCard } from "@/components/sync-progress-card";
import { WelcomeModal } from "@/components/welcome-modal";
import { useAccountStatus } from "@/hooks/use-account-status";

const SUMMARY_CARDS = [
  { label: "Net Worth" },
  { label: "Spending This Month" },
  { label: "Upcoming Bills" },
];

function SummaryCard({ label }: { label: string }) {
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
      <Typography variant="h6" sx={{ fontWeight: 600, color: "grey.300", mt: 0.5 }}>
        —
      </Typography>
    </Card>
  );
}

// Isolated to a narrow Suspense boundary so the dashboard layout
// remains server-renderable. useSearchParams() only suspends this component.
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

type DashboardState = "pre_connection" | "syncing" | "connected";

function deriveDashboardState(
  hasConnectedAccounts: boolean,
  hasActiveSync: boolean,
  latestSyncStatus: string | null,
): DashboardState {
  if (!hasConnectedAccounts) return "pre_connection";
  if (hasActiveSync) return "syncing";
  if (latestSyncStatus === "FAILED") return "syncing";
  return "connected";
}

export default function DashboardPage() {
  const { data: accountStatus, mutate } = useAccountStatus();

  const firstItem = accountStatus?.items[0] ?? null;
  const latestSyncStatus = firstItem?.latest_sync?.status ?? null;

  const dashboardState = deriveDashboardState(
    accountStatus?.has_connected_accounts ?? false,
    accountStatus?.has_active_sync ?? false,
    latestSyncStatus,
  );

  const handlePlaidSuccess = useCallback(async (publicToken: string, metadata: Record<string, unknown>) => {
    try {
      const res = await fetch("/api/v1/plaid/exchange-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          public_token: publicToken,
          institution: metadata.institution,
          accounts: (metadata.accounts as Array<Record<string, unknown>>)?.map((a) => ({
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

      // Trigger immediate revalidation to start polling
      mutate();
    } catch {
      toast.error("Failed to connect accounts. Please try again.");
    }
  }, [mutate]);

  const handleRetry = useCallback(async () => {
    if (!firstItem?.latest_sync?.id) return;

    try {
      const res = await fetch("/api/v1/plaid/retry-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plaid_item_id: firstItem.id }),
      });

      if (!res.ok) {
        throw new Error("Failed to retry sync");
      }

      mutate();
    } catch {
      toast.error("Failed to retry sync. Please try again.");
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

    if (dashboardState === "connected") {
      // Stub for PRI-20: ConnectedAccountsCard
      return (
        <Card variant="outlined" sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="body2" sx={{ color: "grey.500" }}>
            Accounts connected — details coming in next update.
          </Typography>
        </Card>
      );
    }

    return <ConnectionCard onSuccess={handlePlaidSuccess} />;
  }

  return (
    <>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: 2,
          }}
        >
          {SUMMARY_CARDS.map((card) => (
            <SummaryCard key={card.label} label={card.label} />
          ))}
        </Box>

        {renderMainCard()}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 2,
          }}
        >
          <EmptyStateCard
            title="Recent Activity"
            icon={ReceiptLongOutlined}
            heading="No transactions yet"
            description="Transactions will appear here once your accounts are connected."
          />
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
