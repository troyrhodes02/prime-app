"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import AccountBalanceOutlined from "@mui/icons-material/AccountBalanceOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import BlockOutlined from "@mui/icons-material/BlockOutlined";
import { TrustBadge } from "@/components/trust-badge";
import { usePlaidLink } from "@/hooks/use-plaid-link";

interface ConnectionCardProps {
  onSuccess: (publicToken: string, metadata: Record<string, unknown>) => void;
}

export function ConnectionCard({ onSuccess }: ConnectionCardProps) {
  const { open, ready, loading } = usePlaidLink({ onSuccess });

  return (
    <Card variant="outlined" sx={{ p: 5, textAlign: "center" }}>
      <AccountBalanceOutlined sx={{ fontSize: 48, color: "grey.400" }} />

      <Typography
        variant="h6"
        sx={{ fontWeight: 600, color: "grey.900", mt: 2 }}
      >
        Connect your financial accounts
      </Typography>

      <Typography
        variant="body2"
        sx={{ color: "grey.500", maxWidth: 480, mx: "auto", mt: 1 }}
      >
        P.R.I.M.E. securely connects to your bank to organize transactions,
        track spending, and help you make confident financial decisions.
      </Typography>

      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          gap: 2,
          mt: 3,
          flexWrap: "wrap",
        }}
      >
        <TrustBadge icon={VisibilityOutlined} label="Read-only access" />
        <TrustBadge icon={LockOutlined} label="Encrypted & secure" />
        <TrustBadge icon={BlockOutlined} label="No money movement" />
      </Box>

      <Button
        variant="contained"
        onClick={() => open()}
        disabled={!ready || loading}
        sx={{
          mt: 3,
          px: 4,
          py: 1.25,
          borderRadius: 2,
          textTransform: "none",
          fontWeight: 600,
        }}
      >
        {loading ? (
          <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
        ) : null}
        {loading ? "Connecting…" : "Connect Accounts"}
      </Button>

      <Typography
        variant="caption"
        sx={{ display: "block", color: "grey.400", mt: 1.5 }}
      >
        Secured by Plaid
      </Typography>
    </Card>
  );
}
