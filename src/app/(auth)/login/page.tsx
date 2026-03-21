"use client";

import { useState } from "react";
import Link from "next/link";
import Typography from "@mui/material/Typography";
import MuiLink from "@mui/material/Link";
import { AuthCard } from "@/components/auth/auth-card";
import { EmailForm } from "@/components/auth/email-form";
import { AuthDivider } from "@/components/auth/auth-divider";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  return (
    <AuthCard>
      <Typography
        variant="h5"
        sx={{
          textAlign: "center",
          fontWeight: 600,
          color: "grey.900",
        }}
      >
        Welcome back
      </Typography>
      <Typography
        sx={{
          mt: 0.5,
          textAlign: "center",
          fontSize: "0.875rem",
          color: "grey.500",
        }}
      >
        Sign in to your financial workspace
      </Typography>

      <EmailForm onLoadingChange={setLoading} />

      <AuthDivider />

      <GoogleSignInButton disabled={loading} />

      <Typography
        sx={{
          mt: 3,
          textAlign: "center",
          fontSize: "0.75rem",
          color: "grey.400",
        }}
      >
        Don&apos;t have an account?{" "}
        <MuiLink
          component={Link}
          href="/signup"
          sx={{ color: "primary.main", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
        >
          Get started
        </MuiLink>
      </Typography>
    </AuthCard>
  );
}
