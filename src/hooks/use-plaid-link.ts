"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePlaidLink as usePlaidLinkLib } from "react-plaid-link";
import { toast } from "sonner";

interface UsePlaidLinkOptions {
  onSuccess: (publicToken: string, metadata: Record<string, unknown>) => void;
}

export function usePlaidLink({ onSuccess }: UsePlaidLinkOptions) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const pendingOpen = useRef(false);

  const { open, ready } = usePlaidLinkLib({
    token: linkToken,
    onSuccess: (publicToken, metadata) => {
      setLoading(false);
      pendingOpen.current = false;
      onSuccess(publicToken, metadata as unknown as Record<string, unknown>);
    },
    onExit: () => {
      setLoading(false);
      pendingOpen.current = false;
    },
  });

  // Auto-open Plaid Link once the token is fetched and the lib is ready
  useEffect(() => {
    if (pendingOpen.current && ready && linkToken) {
      pendingOpen.current = false;
      open();
    }
  }, [ready, linkToken, open]);

  const handleOpen = useCallback(async () => {
    // Always fetch a fresh token — link tokens expire (4h default)
    // and reusing a stale one silently breaks Plaid Link
    setLoading(true);
    pendingOpen.current = true;

    try {
      const res = await fetch("/api/v1/plaid/create-link-token", {
        method: "POST",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create link token");
      }

      const data = await res.json();
      setLinkToken(data.link_token);
    } catch {
      toast.error("Could not connect to your bank. Please try again.");
      setLoading(false);
      pendingOpen.current = false;
    }
  }, []);

  return {
    open: handleOpen,
    ready: !loading,
    loading,
  };
}
