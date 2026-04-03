export const DASHBOARD_PERIODS = [
  "this_month",
  "last_30",
  "last_60",
  "last_90",
] as const;

export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

export const DEFAULT_PERIOD: DashboardPeriod = "this_month";

export const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  this_month: "This Month",
  last_30: "Last 30 Days",
  last_60: "Last 60 Days",
  last_90: "Last 90 Days",
};

export function getPeriodLabel(period: DashboardPeriod): string {
  if (period === "this_month") {
    const now = new Date();
    return now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  return PERIOD_LABELS[period];
}
