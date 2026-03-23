"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";
import AccountBalanceOutlined from "@mui/icons-material/AccountBalanceOutlined";
import AddOutlined from "@mui/icons-material/AddOutlined";
import { usePlaidLink } from "@/hooks/use-plaid-link";
import type { AccountStatusItem } from "@/hooks/use-account-status";

interface ActivationCardProps {
  items: AccountStatusItem[];
  onPlaidSuccess: (publicToken: string, metadata: Record<string, unknown>) => void;
}

export function ActivationCard({ items, onPlaidSuccess }: ActivationCardProps) {
  const { open, loading } = usePlaidLink({ onSuccess: onPlaidSuccess });

  return (
    <Card variant="outlined" sx={{ p: 5, textAlign: "center" }}>
      <CheckCircleOutlined
        sx={{
          fontSize: 48,
          color: "success.main",
          animation: "scaleIn 300ms ease-out",
          "@keyframes scaleIn": {
            "0%": { transform: "scale(0.8)", opacity: 0 },
            "100%": { transform: "scale(1)", opacity: 1 },
          },
        }}
      />

      <Typography variant="h6" sx={{ fontWeight: 600, color: "grey.900", mt: 2 }}>
        Your financial profile is ready
      </Typography>

      <Typography
        variant="body2"
        sx={{ color: "grey.500", maxWidth: 440, mx: "auto", mt: 1 }}
      >
        We&apos;ve connected your accounts and started analyzing your financial
        activity. Your insights are being prepared.
      </Typography>

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
                  Synced
                </Typography>
              </Box>
            </Box>
            <CheckCircleOutlined
              sx={{ fontSize: 16, color: "success.light", flexShrink: 0 }}
            />
          </Box>
        ))}
      </Box>

      <Button
        variant="outlined"
        onClick={() => open()}
        disabled={loading}
        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AddOutlined />}
        sx={{ mt: 3, textTransform: "none" }}
      >
        Connect Another Account
      </Button>
    </Card>
  );
}
