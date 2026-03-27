"use client";

import useSWR from "swr";

type CategoryBreakdown = {
  category: string;
  label: string;
  totalCents: number;
  pct: number;
};

type ClassificationReady = {
  status: "ready";
  fixed_cents: number;
  flexible_cents: number;
  fixed_pct: number;
  flexible_pct: number;
  fixed_categories: CategoryBreakdown[];
  flexible_categories: CategoryBreakdown[];
  window_days: number;
  transaction_count: number;
  computed_at: string;
};

type ClassificationInsufficientData = {
  status: "insufficient_data";
  fixed_cents: 0;
  flexible_cents: 0;
  fixed_pct: 0;
  flexible_pct: 0;
  fixed_categories: [];
  flexible_categories: [];
  window_days: number;
  transaction_count: number;
  computed_at: string;
};

type ClassificationUnavailable = {
  status: "unavailable";
};

export type ClassificationResponse =
  | ClassificationReady
  | ClassificationInsufficientData
  | ClassificationUnavailable;

async function fetcher(url: string): Promise<ClassificationResponse> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch expense classification");
  return res.json();
}

export function useExpenseClassification() {
  const { data, error, isLoading, mutate } = useSWR<ClassificationResponse>(
    "/api/v1/expense-classification",
    fetcher,
  );

  return {
    data,
    error,
    isLoading,
    mutate,
  };
}
