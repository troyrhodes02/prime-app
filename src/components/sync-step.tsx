"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import CheckOutlined from "@mui/icons-material/CheckOutlined";
import CloseOutlined from "@mui/icons-material/CloseOutlined";

export type StepStatus = "completed" | "in_progress" | "pending" | "failed";

interface SyncStepProps {
  label: string;
  status: StepStatus;
}

function StepCircle({ status }: { status: StepStatus }) {
  if (status === "completed") {
    return (
      <Box
        sx={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          bgcolor: "success.main",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <CheckOutlined sx={{ fontSize: 14, color: "white" }} />
      </Box>
    );
  }

  if (status === "in_progress") {
    return (
      <Box
        sx={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          border: "2px solid",
          borderColor: "primary.main",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          animation: "pulse 2s ease-in-out infinite",
          "@keyframes pulse": {
            "0%, 100%": { opacity: 1 },
            "50%": { opacity: 0.5 },
          },
        }}
      >
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            bgcolor: "primary.main",
          }}
        />
      </Box>
    );
  }

  if (status === "failed") {
    return (
      <Box
        sx={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          bgcolor: "error.main",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <CloseOutlined sx={{ fontSize: 14, color: "white" }} />
      </Box>
    );
  }

  // pending
  return (
    <Box
      sx={{
        width: 24,
        height: 24,
        borderRadius: "50%",
        bgcolor: "grey.200",
        flexShrink: 0,
      }}
    />
  );
}

export function SyncStep({ label, status }: SyncStepProps) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
      <StepCircle status={status} />
      <Typography
        variant="body2"
        sx={{
          fontWeight: 500,
          color: status === "pending" ? "grey.400" : "grey.900",
          flex: 1,
        }}
      >
        {label}
      </Typography>
      {status === "completed" && (
        <Typography variant="caption" sx={{ color: "success.main" }}>
          Done
        </Typography>
      )}
      {status === "in_progress" && <CircularProgress size={14} />}
    </Box>
  );
}
