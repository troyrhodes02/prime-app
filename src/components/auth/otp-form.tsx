"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import SvgIcon from "@mui/material/SvgIcon";
import MuiLink from "@mui/material/Link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const RESEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;

export function OtpForm({ email }: { email: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const redirectToSignup = useCallback(() => {
    setTimeout(() => {
      router.push("/signup");
    }, 3000);
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!code.trim() || loading) return;

    if (attempts >= MAX_ATTEMPTS) {
      setError("Too many attempts. Please start over.");
      redirectToSignup();
      return;
    }

    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      });

      if (verifyError) {
        setAttempts((prev) => {
          const next = prev + 1;
          if (next >= MAX_ATTEMPTS) {
            setError("Too many attempts. Please start over.");
            redirectToSignup();
          } else if (
            verifyError.message?.toLowerCase().includes("expired")
          ) {
            setError("This code has expired. Request a new one.");
          } else {
            setError("Invalid code. Check your email and try again.");
          }
          return next;
        });
        setCode("");
        inputRef.current?.focus();
        return;
      }

      // Success — Supabase session is now set.
      // The callback route handles provisioning for new users.
      // For OTP verification, the session is created directly,
      // so we check if the user needs provisioning by redirecting through callback.
      window.location.href = "/api/auth/callback?source=otp";
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;

    try {
      const supabase = createClient();
      const { error: resendError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });

      if (resendError) {
        if (resendError.status === 429) {
          toast.error("Too many attempts. Try again shortly.");
        } else {
          toast.error("Could not resend code. Please try again.");
        }
        return;
      }

      toast.success("Verification code sent");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  }

  return (
    <>
      <Typography
        variant="h5"
        sx={{
          textAlign: "center",
          fontWeight: 600,
          color: "grey.900",
        }}
      >
        Check your email
      </Typography>
      <Typography
        sx={{
          mt: 0.5,
          textAlign: "center",
          fontSize: "0.875rem",
          color: "grey.500",
        }}
      >
        We sent a verification code to{" "}
        <Box component="span" sx={{ fontWeight: 500, color: "grey.700" }}>
          {email}
        </Box>
      </Typography>

      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
        <TextField
          inputRef={inputRef}
          type="text"
          fullWidth
          placeholder="Enter code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, ""));
            if (error) setError("");
          }}
          disabled={loading || attempts >= MAX_ATTEMPTS}
          error={!!error}
          helperText={error}
          size="small"
          slotProps={{
            input: {
              inputMode: "numeric",
              autoComplete: "one-time-code",
              sx: {
                textAlign: "center",
                fontSize: "1.125rem",
                fontWeight: 500,
                letterSpacing: "0.15em",
              },
            },
            formHelperText: {
              sx: { textAlign: "center" },
            },
          }}
          sx={{ mb: 1.5 }}
        />
        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={!code.trim() || loading || attempts >= MAX_ATTEMPTS}
          disableElevation
          sx={{ py: 1.25 }}
        >
          {loading ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            "Verify"
          )}
        </Button>
      </Box>

      <Typography
        sx={{
          mt: 2,
          textAlign: "center",
          fontSize: "0.75rem",
          color: "grey.400",
        }}
      >
        Didn&apos;t receive a code?{" "}
        <MuiLink
          component="button"
          type="button"
          onClick={handleResend}
          disabled={resendCooldown > 0}
          sx={{
            fontSize: "0.75rem",
            color: resendCooldown > 0 ? "grey.300" : "primary.main",
            textDecoration: "none",
            cursor: resendCooldown > 0 ? "default" : "pointer",
            "&:hover": {
              textDecoration: resendCooldown > 0 ? "none" : "underline",
            },
            border: "none",
            background: "none",
            verticalAlign: "baseline",
          }}
        >
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend"}
        </MuiLink>
      </Typography>

      <Button
        onClick={() =>
          router.push(`/signup?email=${encodeURIComponent(email)}`)
        }
        startIcon={
          <SvgIcon sx={{ fontSize: 16 }}>
            <path
              d="M19 12H5M12 19l-7-7 7-7"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </SvgIcon>
        }
        sx={{
          mt: 2,
          mx: "auto",
          display: "flex",
          color: "grey.500",
          fontSize: "0.875rem",
          textTransform: "none",
          "&:hover": {
            color: "grey.700",
            bgcolor: "transparent",
          },
        }}
      >
        Back
      </Button>
    </>
  );
}
