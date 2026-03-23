"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import AccountBalanceOutlined from "@mui/icons-material/AccountBalanceOutlined";
import { SyncStep, type StepStatus } from "@/components/sync-step";

const SYNC_STEPS = [
  { key: "CONNECTING", label: "Connecting accounts" },
  { key: "SYNCING_BALANCES", label: "Syncing balances" },
  { key: "RETRIEVING_TRANSACTIONS", label: "Retrieving transactions" },
  { key: "ANALYZING", label: "Analyzing your financial activity" },
] as const;

type SyncStepKey = (typeof SYNC_STEPS)[number]["key"];

const STEP_ORDER: Record<SyncStepKey | "DONE", number> = {
  CONNECTING: 0,
  SYNCING_BALANCES: 1,
  RETRIEVING_TRANSACTIONS: 2,
  ANALYZING: 3,
  DONE: 4,
};

interface SyncProgressCardProps {
  institutionName: string | null;
  accountCount: number;
  syncStatus: string;
  syncStep: string;
  startedAt: string;
  onRetry?: () => void;
}

function deriveStepStatus(
  stepKey: SyncStepKey,
  currentStep: string,
  syncStatus: string,
): StepStatus {
  const stepIndex = STEP_ORDER[stepKey];
  const currentIndex = STEP_ORDER[currentStep as SyncStepKey | "DONE"] ?? 0;

  if (syncStatus === "FAILED") {
    if (stepIndex < currentIndex) return "completed";
    if (stepIndex === currentIndex) return "failed";
    return "pending";
  }

  if (syncStatus === "COMPLETED" || currentStep === "DONE") {
    return "completed";
  }

  if (stepIndex < currentIndex) return "completed";
  if (stepIndex === currentIndex) return "in_progress";
  return "pending";
}

export function SyncProgressCard({
  institutionName,
  accountCount,
  syncStatus,
  syncStep,
  startedAt,
  onRetry,
}: SyncProgressCardProps) {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    const check = () => {
      const elapsed = Date.now() - new Date(startedAt).getTime();
      setIsSlow(elapsed > 60_000);
    };
    check();
    const interval = setInterval(check, 10_000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const isFailed = syncStatus === "FAILED";

  return (
    <Card variant="outlined" sx={{ p: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1,
            bgcolor: "primary.main",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AccountBalanceOutlined sx={{ color: "white", fontSize: 22 }} />
        </Box>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {institutionName ?? "Financial Institution"}
          </Typography>
          <Typography variant="body2" sx={{ color: "grey.500" }}>
            {accountCount} {accountCount === 1 ? "account" : "accounts"}{" "}
            connected
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 3 }} />

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
        {SYNC_STEPS.map((step) => (
          <SyncStep
            key={step.key}
            label={step.label}
            status={deriveStepStatus(step.key, syncStep, syncStatus)}
          />
        ))}
      </Box>

      {isFailed && onRetry && (
        <Button
          variant="outlined"
          color="error"
          size="small"
          onClick={onRetry}
          sx={{ mt: 2, textTransform: "none" }}
        >
          Retry
        </Button>
      )}

      <Typography
        variant="caption"
        sx={{
          color: isSlow ? "warning.main" : "grey.400",
          mt: 2,
          display: "block",
        }}
      >
        {isFailed
          ? "Something went wrong syncing your accounts."
          : isSlow
            ? "Taking a bit longer than usual. Hang tight."
            : "This usually takes a minute or two."}
      </Typography>
    </Card>
  );
}
