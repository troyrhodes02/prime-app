"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import AccountBalanceOutlined from "@mui/icons-material/AccountBalanceOutlined";
import CreditCardOutlined from "@mui/icons-material/CreditCardOutlined";
import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";
import type { AccountStatusItem } from "@/hooks/use-account-status";

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return "Never";
  const diffMs = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatAccountSubline(type: string, mask: string | null): string {
  const typeLabel = type.charAt(0) + type.slice(1).toLowerCase();
  if (mask) return `${typeLabel} ···· ${mask}`;
  return typeLabel;
}

interface ConnectedInstitutionRowProps {
  item: AccountStatusItem;
}

export function ConnectedInstitutionRow({ item }: ConnectedInstitutionRowProps) {
  return (
    <Box
      sx={{
        border: 1,
        borderColor: "grey.200",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      {/* Institution header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 2,
          py: 1.5,
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1.5,
            bgcolor: "primary.main",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <AccountBalanceOutlined sx={{ fontSize: 18, color: "white" }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
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
            <Typography variant="caption" sx={{ color: "grey.500" }}>
              Last synced {formatRelativeTime(item.last_synced_at)}
            </Typography>
          </Box>
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            px: 1,
            py: 0.25,
            bgcolor: item.status === "ACTIVE" ? "success.50" : "warning.50",
            borderRadius: 1,
          }}
        >
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              bgcolor: item.status === "ACTIVE" ? "success.main" : "warning.main",
            }}
          />
          <Typography
            variant="caption"
            sx={{
              fontWeight: 500,
              color: item.status === "ACTIVE" ? "success.dark" : "warning.dark",
              fontSize: "0.6875rem",
            }}
          >
            {item.status === "ACTIVE" ? "Active" : "Reconnect needed"}
          </Typography>
        </Box>
      </Box>

      {/* Account rows */}
      {item.accounts.map((account) => (
        <Box
          key={account.id}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            px: 2,
            pl: 7,
            py: 1.25,
            borderTop: 1,
            borderColor: "grey.100",
          }}
        >
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: 1,
              bgcolor: "grey.100",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <CreditCardOutlined sx={{ fontSize: 14, color: "grey.400" }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ color: "grey.700" }}>
              {account.name}
            </Typography>
            <Typography variant="caption" sx={{ color: "grey.400" }}>
              {formatAccountSubline(account.type, account.mask)}
            </Typography>
          </Box>
          <CheckCircleOutlined
            sx={{ fontSize: 16, color: "success.light", flexShrink: 0 }}
          />
        </Box>
      ))}
    </Box>
  );
}
