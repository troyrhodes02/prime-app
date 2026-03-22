"use client";

import { useSearchParams } from "next/navigation";
import Alert from "@mui/material/Alert";

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "Something went wrong. Please try again.",
  auth_failed: "Authentication failed. Please try again.",
  provisioning_failed:
    "Could not create your workspace. Please try again.",
};

export function AuthErrorBanner() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  if (!error || !ERROR_MESSAGES[error]) return null;

  return (
    <Alert
      severity="error"
      sx={{
        mb: 2,
        fontSize: "0.8125rem",
        borderRadius: 2,
      }}
    >
      {ERROR_MESSAGES[error]}
    </Alert>
  );
}
