"use client";

import useSWR from "swr";
import type { DashboardPeriod } from "@/lib/dashboard-period";

type DashboardSummaryReady = {
  status: "ready";
  period: DashboardPeriod;
  period_label: string;
  income_cents: number;
  spending_cents: number;
  available_cents: number;
  fixed_cents: number;
  flexible_cents: number;
  fixed_pct: number;
  flexible_pct: number;
  window_days: number;
  transaction_count: number;
};

type DashboardSummaryNoData = {
  status: "no_data";
  period: DashboardPeriod;
  period_label: string;
  income_cents: 0;
  spending_cents: 0;
  available_cents: 0;
  fixed_cents: 0;
  flexible_cents: 0;
  fixed_pct: 0;
  flexible_pct: 0;
  window_days: number;
  transaction_count: 0;
};

export type DashboardSummaryResponse =
  | DashboardSummaryReady
  | DashboardSummaryNoData;

async function fetcher(url: string): Promise<DashboardSummaryResponse> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch dashboard summary");
  return res.json();
}

export function useDashboardSummary(period: DashboardPeriod) {
  const { data, error, isLoading, mutate } = useSWR<DashboardSummaryResponse>(
    `/api/v1/dashboard-summary?period=${period}`,
    fetcher,
  );

  return {
    data,
    error,
    isLoading,
    mutate,
  };
}
