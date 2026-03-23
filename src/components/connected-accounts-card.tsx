"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import AddOutlined from "@mui/icons-material/AddOutlined";
import { usePlaidLink } from "@/hooks/use-plaid-link";
import { ConnectedInstitutionRow } from "@/components/connected-institution-row";
import type { AccountStatusItem } from "@/hooks/use-account-status";

interface ConnectedAccountsCardProps {
  items: AccountStatusItem[];
  onPlaidSuccess: (publicToken: string, metadata: Record<string, unknown>) => void;
}

export function ConnectedAccountsCard({
  items,
  onPlaidSuccess,
}: ConnectedAccountsCardProps) {
  const { open, loading } = usePlaidLink({ onSuccess: onPlaidSuccess });

  return (
    <Card variant="outlined" sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Typography variant="body1" sx={{ fontWeight: 500 }}>
          Connected Accounts
        </Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={() => open()}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <AddOutlined sx={{ fontSize: 14 }} />}
          sx={{ textTransform: "none", fontSize: "0.75rem" }}
        >
          Add Account
        </Button>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {items.map((item) => (
          <ConnectedInstitutionRow key={item.id} item={item} />
        ))}
      </Box>

      <Typography
        variant="caption"
        sx={{ color: "grey.400", mt: 2, display: "block" }}
      >
        All connections are read-only and secured by Plaid.
      </Typography>
    </Card>
  );
}
