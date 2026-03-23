"use client";

import useSWR from "swr";

interface AccountStatusAccount {
  id: string;
  name: string;
  type: string;
  mask: string | null;
  is_active: boolean;
}

interface LatestSync {
  id: string;
  status: string;
  step: string;
  type: string;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  accounts_synced: number;
  transactions_synced: number;
}

export interface AccountStatusItem {
  id: string;
  institution_id: string | null;
  institution_name: string | null;
  status: string;
  last_synced_at: string | null;
  accounts: AccountStatusAccount[];
  latest_sync: LatestSync | null;
}

export interface AccountStatusResponse {
  items: AccountStatusItem[];
  has_connected_accounts: boolean;
  has_active_sync: boolean;
}

async function fetcher(url: string): Promise<AccountStatusResponse> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch account status");
  return res.json();
}

export function useAccountStatus() {
  const { data, error, isLoading, mutate } = useSWR<AccountStatusResponse>(
    "/api/v1/accounts/status",
    fetcher,
    {
      refreshInterval: (latestData) =>
        latestData?.has_active_sync ? 4000 : 0,
      revalidateOnFocus: true,
    },
  );

  return {
    data,
    error,
    isLoading,
    mutate,
  };
}
