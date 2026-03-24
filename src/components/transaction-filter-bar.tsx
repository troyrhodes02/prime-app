"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import type { AccountStatusItem } from "@/hooks/use-account-status";

interface TransactionFilterBarProps {
  accountId: string;
  type: string;
  days: number;
  accounts: AccountStatusItem[];
  onAccountChange: (accountId: string) => void;
  onTypeChange: (type: string) => void;
  onDaysChange: (days: number) => void;
}

const TYPE_OPTIONS = ["All", "Income", "Expense"] as const;
const DAYS_OPTIONS = [
  { label: "Last 30 days", value: 30 },
  { label: "Last 90 days", value: 90 },
] as const;

const activeChipSx = {
  bgcolor: "rgba(37, 99, 235, 0.08)",
  borderColor: "primary.main",
  color: "primary.main",
  fontWeight: 500,
  fontSize: 13,
};

const inactiveChipSx = {
  bgcolor: "white",
  borderColor: "grey.200",
  color: "grey.700",
  fontWeight: 500,
  fontSize: 13,
};

function buildAccountOptions(items: AccountStatusItem[]) {
  const options: { id: string; label: string }[] = [];
  for (const item of items) {
    for (const account of item.accounts) {
      const mask = account.mask ? ` ··${account.mask}` : "";
      options.push({ id: account.id, label: `${account.name}${mask}` });
    }
  }
  return options;
}

export function TransactionFilterBar({
  accountId,
  type,
  days,
  accounts,
  onAccountChange,
  onTypeChange,
  onDaysChange,
}: TransactionFilterBarProps) {
  const accountOptions = buildAccountOptions(accounts);

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1,
        px: 2.5,
        py: 1.5,
        bgcolor: "grey.50",
        borderBottom: "1px solid",
        borderColor: "grey.200",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Select
          size="small"
          value={accountId}
          onChange={(e: SelectChangeEvent) => onAccountChange(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="all">All Accounts</MenuItem>
          {accountOptions.map((a) => (
            <MenuItem key={a.id} value={a.id}>
              {a.label}
            </MenuItem>
          ))}
        </Select>

        {TYPE_OPTIONS.map((t) => {
          const value = t.toLowerCase();
          const isActive = type === value;
          return (
            <Chip
              key={t}
              label={t}
              variant="outlined"
              onClick={() => onTypeChange(value)}
              sx={isActive ? activeChipSx : inactiveChipSx}
            />
          );
        })}
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {DAYS_OPTIONS.map((d) => {
          const isActive = days === d.value;
          return (
            <Chip
              key={d.value}
              label={d.label}
              variant="outlined"
              onClick={() => onDaysChange(d.value)}
              sx={isActive ? activeChipSx : inactiveChipSx}
            />
          );
        })}
      </Box>
    </Box>
  );
}
