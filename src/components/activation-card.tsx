"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";
import AccountBalanceOutlined from "@mui/icons-material/AccountBalanceOutlined";
import AddOutlined from "@mui/icons-material/AddOutlined";
import { usePlaidLink } from "@/hooks/use-plaid-link";
import type { AccountStatusItem } from "@/hooks/use-account-status";

interface ActivationCardProps {
  items: AccountStatusItem[];
  onPlaidSuccess: (publicToken: string, metadata: Record<string, unknown>) => void;
  onDismiss: () => void;
}

export function ActivationCard({ items, onPlaidSuccess, onDismiss }: ActivationCardProps) {
  const { open, loading } = usePlaidLink({ onSuccess: onPlaidSuccess });

  const totalAccounts = items.reduce((sum, item) => sum + item.accounts.length, 0);

  return (
    <Card variant="outlined" sx={{ p: 5, textAlign: "center" }}>
      {/* Status indicator */}
      <Box
        sx={{
          mx: "auto",
          width: 40,
          height: 40,
          borderRadius: "50%",
          bgcolor: "#ECFDF5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: "scaleIn 300ms ease-out",
          "@keyframes scaleIn": {
            "0%": { transform: "scale(0.8)", opacity: 0 },
            "100%": { transform: "scale(1)", opacity: 1 },
          },
        }}
      >
        <CheckCircleOutlined sx={{ fontSize: 22, color: "#059669" }} />
      </Box>

      <Typography variant="h6" sx={{ fontWeight: 600, color: "grey.900", mt: 2 }}>
        Analysis complete
      </Typography>

      <Typography
        variant="body2"
        sx={{ color: "grey.500", maxWidth: 400, mx: "auto", mt: 1, lineHeight: 1.6 }}
      >
        P.R.I.M.E. has reviewed your financial activity across{" "}
        {totalAccounts} {totalAccounts === 1 ? "account" : "accounts"} and is
        building your financial picture. Insights are being prepared.
      </Typography>

      {/* Institution list */}
      <Box
        sx={{
          mt: 3,
          display: "flex",
          flexDirection: "column",
          gap: 1,
          maxWidth: 360,
          mx: "auto",
        }}
      >
        {items.map((item) => (
          <Box
            key={item.id}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              px: 2,
              py: 1.5,
              bgcolor: "grey.50",
              border: 1,
              borderColor: "grey.200",
              borderRadius: 2,
            }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1,
                bgcolor: "primary.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <AccountBalanceOutlined sx={{ fontSize: 16, color: "white" }} />
            </Box>
            <Box sx={{ flex: 1, textAlign: "left", minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {item.institution_name ?? "Financial Institution"}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Typography variant="caption" sx={{ color: "grey.500" }}>
                  {item.accounts.length}{" "}
                  {item.accounts.length === 1 ? "account" : "accounts"}
                </Typography>
                <Typography variant="caption" sx={{ color: "grey.300" }}>
                  ·
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 500, color: "success.main" }}
                >
                  Analyzed
                </Typography>
              </Box>
            </Box>
            <CheckCircleOutlined
              sx={{ fontSize: 16, color: "success.light", flexShrink: 0 }}
            />
          </Box>
        ))}
      </Box>

      {/* Primary CTA */}
      {/* TODO: navigate to /overview once financial overview page is built */}
      <Button
        variant="contained"
        disableElevation
        onClick={onDismiss}
        sx={{ mt: 3.5, textTransform: "none", px: 3.5, py: 1.25 }}
      >
        See Financial Overview
      </Button>

      {/* Secondary actions */}
      <Divider sx={{ mt: 3.5, mb: 2.5, mx: "auto", maxWidth: 360 }} />

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
        <Button
          variant="outlined"
          size="small"
          onClick={() => open()}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <AddOutlined sx={{ fontSize: 16 }} />}
          sx={{ textTransform: "none", fontSize: "0.8125rem", color: "grey.700", borderColor: "grey.300", "&:hover": { borderColor: "grey.400", bgcolor: "grey.50" } }}
        >
          Connect Another Account
        </Button>

        {/* TODO: navigate to /transactions once Transactions page is built */}
        <Typography
          component="button"
          onClick={onDismiss}
          sx={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "0.8125rem",
            color: "grey.400",
            "&:hover": { color: "grey.600" },
            transition: "color 150ms",
            p: 0,
          }}
        >
          View transactions
        </Typography>
      </Box>
    </Card>
  );
}
