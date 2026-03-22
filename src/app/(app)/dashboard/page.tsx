"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import AccountBalanceOutlined from "@mui/icons-material/AccountBalanceOutlined";
import LightbulbOutlined from "@mui/icons-material/LightbulbOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import { EmptyStateCard } from "@/components/empty-state-card";
import { WelcomeModal } from "@/components/welcome-modal";

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

function GetStartedCard() {
  return (
    <Card variant="outlined" sx={{ p: 5, textAlign: "center" }}>
      <AccountBalanceOutlined sx={{ fontSize: 48, color: "grey.400" }} />
      <Typography variant="h6" sx={{ fontWeight: 600, color: "grey.900", mt: 2 }}>
        Connect your financial accounts to get started
      </Typography>
      <Typography
        variant="body2"
        sx={{ color: "grey.500", maxWidth: 420, mx: "auto", mt: 1 }}
      >
        P.R.I.M.E. will automatically organize your transactions, track your spending,
        and help you make confident financial decisions.
      </Typography>
      <Button variant="outlined" disabled sx={{ mt: 3 }}>
        Connect Accounts
      </Button>
      <Typography
        variant="caption"
        sx={{ display: "block", color: "grey.400", mt: 1 }}
      >
        Coming soon
      </Typography>
    </Card>
  );
}

// Isolated to a narrow Suspense boundary so the dashboard layout
// remains server-renderable. useSearchParams() only suspends this component.
function WelcomeModalController() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const showWelcome = searchParams.get("welcome") === "true";

  function handleWelcomeClose() {
    router.replace("/dashboard");
  }

  return <WelcomeModal open={showWelcome} onClose={handleWelcomeClose} />;
}

export default function DashboardPage() {
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

        <GetStartedCard />

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
