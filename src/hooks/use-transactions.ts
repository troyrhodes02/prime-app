"use client";

import useSWR from "swr";

interface TransactionAccount {
  id: string;
  name: string;
  type: string;
  mask: string | null;
}

export interface Transaction {
  id: string;
  amount_cents: number;
  iso_currency_code: string;
  date: string;
  display_name: string;
  original_name: string;
  merchant_name: string | null;
  category: string;
  transaction_type: "INCOME" | "EXPENSE";
  pending: boolean;
  account: TransactionAccount;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  total: number;
  filtered_count: number;
}

export interface TransactionFilters {
  accountId?: string;
  type?: "all" | "income" | "expense";
  days?: 30 | 90;
}

function buildKey(filters: TransactionFilters): string {
  const params = new URLSearchParams();
  if (filters.accountId && filters.accountId !== "all") {
    params.set("accountId", filters.accountId);
  }
  if (filters.type && filters.type !== "all") {
    params.set("type", filters.type);
  }
  if (filters.days) {
    params.set("days", String(filters.days));
  }
  const qs = params.toString();
  return `/api/v1/transactions${qs ? `?${qs}` : ""}`;
}

async function fetcher(url: string): Promise<TransactionsResponse> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch transactions");
  return res.json();
}

export function useTransactions(filters: TransactionFilters = {}) {
  const key = buildKey(filters);
  const { data, error, isLoading, mutate } = useSWR<TransactionsResponse>(
    key,
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
