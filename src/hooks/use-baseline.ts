"use client";

import useSWR from "swr";

type BaselineReady = {
  status: "ready";
  monthly_income_cents: number;
  monthly_spending_cents: number;
  available_cents: number;
  window_days: number;
  transaction_count: number;
  computed_at: string;
};

type BaselineInsufficientData = {
  status: "insufficient_data";
  monthly_income_cents: 0;
  monthly_spending_cents: 0;
  available_cents: 0;
  window_days: number;
  transaction_count: number;
  computed_at: string;
};

type BaselineUnavailable = {
  status: "unavailable";
};

export type BaselineResponse =
  | BaselineReady
  | BaselineInsufficientData
  | BaselineUnavailable;

async function fetcher(url: string): Promise<BaselineResponse> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch baseline");
  return res.json();
}

export function useBaseline() {
  const { data, error, isLoading, mutate } = useSWR<BaselineResponse>(
    "/api/v1/baseline",
    fetcher,
  );

  return {
    data,
    error,
    isLoading,
    mutate,
  };
}
