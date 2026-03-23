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
import { ConnectionCard } from "@/components/connection-card";
import { SyncProgressCard } from "@/components/sync-progress-card";
import { ActivationCard } from "@/components/activation-card";
import { ConnectedAccountsCard } from "@/components/connected-accounts-card";
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
  const { data: accountStatus, mutate } = useAccountStatus();

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

  const dashboardState: DashboardState = (() => {
    if (!hasConnectedAccounts) return "pre_connection";
    if (hasActiveSync) return "syncing";
    if (latestSyncStatus === "FAILED") return "syncing";
    if (showActivation) return "activation_complete";
    return "connected";
  })();

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

  function renderMainCard() {
    if (dashboardState === "syncing" && firstItem?.latest_sync) {
      return (
        <SyncProgressCard
          institutionName={firstItem.institution_name}
          accountCount={firstItem.accounts.length}
          syncStatus={firstItem.latest_sync.status}
          syncStep={firstItem.latest_sync.step}
          startedAt={firstItem.latest_sync.started_at}
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
