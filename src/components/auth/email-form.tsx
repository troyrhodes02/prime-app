"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export function EmailForm({
  onLoadingChange,
}: {
  onLoadingChange?: (loading: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function validate(value: string): string | null {
    if (!value.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
      return "Enter a valid email address";
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const normalized = email.trim().toLowerCase();
    const validationError = validate(normalized);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setLoading(true);
    onLoadingChange?.(true);

    try {
      const supabase = createClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: normalized,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });

      if (otpError) {
        if (otpError.status === 429) {
          setError("Too many attempts. Try again shortly.");
        } else {
          setError("Something went wrong. Please try again.");
        }
        return;
      }

      router.push(`/verify?email=${encodeURIComponent(normalized)}`);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
      <TextField
        inputRef={inputRef}
        type="email"
        required
        fullWidth
        placeholder="you@example.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (error) setError("");
        }}
        disabled={loading}
        error={!!error}
        helperText={error}
        size="small"
        sx={{ mb: 1.5 }}
      />
      <Button
        type="submit"
        fullWidth
        variant="contained"
        disabled={loading}
        disableElevation
        sx={{ py: 1.25 }}
      >
        {loading ? (
          <CircularProgress size={20} color="inherit" />
        ) : (
          "Continue"
        )}
      </Button>
    </Box>
  );
}
