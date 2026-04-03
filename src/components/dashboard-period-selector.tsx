"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import {
  DASHBOARD_PERIODS,
  PERIOD_LABELS,
  type DashboardPeriod,
} from "@/lib/dashboard-period";

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

interface DashboardPeriodSelectorProps {
  value: DashboardPeriod;
  onChange: (period: DashboardPeriod) => void;
}

export function DashboardPeriodSelector({
  value,
  onChange,
}: DashboardPeriodSelectorProps) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      {DASHBOARD_PERIODS.map((period) => {
        const isActive = value === period;
        return (
          <Chip
            key={period}
            label={PERIOD_LABELS[period]}
            variant="outlined"
            size="small"
            onClick={() => onChange(period)}
            sx={isActive ? activeChipSx : inactiveChipSx}
          />
        );
      })}
    </Box>
  );
}
