"use client";

import useSWR from "swr";

interface TransactionAccount {
  id: string;
  name: string;
  type: string;
  mask: string | null;
}

export interface RecentTransaction {
  id: string;
  amount_cents: number;
  iso_currency_code: string;
  date: string;
  display_name: string;
  transaction_type: "INCOME" | "EXPENSE";
  pending: boolean;
  account: TransactionAccount;
}

export interface RecentTransactionsResponse {
  transactions: RecentTransaction[];
}

async function fetcher(url: string): Promise<RecentTransactionsResponse> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch recent transactions");
  return res.json();
}

export function useRecentTransactions() {
  const { data, error, isLoading, mutate } = useSWR<RecentTransactionsResponse>(
    "/api/v1/transactions/recent",
    fetcher,
    { revalidateOnFocus: true },
  );

  return {
    data,
    error,
    isLoading,
    mutate,
  };
}
