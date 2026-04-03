"use client";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";
import { EmptyStatePage } from "@/components/empty-state-page";
import { CategoryCard } from "@/components/category-card";
import { useExpenseClassification } from "@/hooks/use-expense-classification";
import { useBaseline } from "@/hooks/use-baseline";

function formatCurrency(cents: number): string {
  const dollars = Math.abs(cents) / 100;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function BudgetSkeleton() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Card variant="outlined" sx={{ p: 3 }}>
        <Skeleton variant="text" width={160} height={28} />
        <Skeleton variant="text" width={120} height={24} sx={{ mt: 0.5 }} />
        <Skeleton
          variant="rectangular"
          height={8}
          sx={{ mt: 2, borderRadius: 1 }}
        />
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mt: 2,
          }}
        >
          <Skeleton variant="text" width={140} />
          <Skeleton variant="text" width={140} />
        </Box>
      </Card>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 3,
        }}
      >
        {[0, 1].map((i) => (
          <Card key={i} variant="outlined" sx={{ p: 3 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <Skeleton variant="text" width={120} />
              <Skeleton variant="text" width={80} />
            </Box>
            <Divider sx={{ my: 1.5 }} />
            {[0, 1, 2].map((j) => (
              <Box
                key={j}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  py: 1.5,
                }}
              >
                <Skeleton variant="text" width={100} />
                <Skeleton variant="text" width={60} />
              </Box>
            ))}
          </Card>
        ))}
      </Box>
    </Box>
  );
}

export default function BudgetPage() {
  const { data: classification, isLoading } = useExpenseClassification();
  const { data: baseline } = useBaseline();

  if (isLoading) {
    return <BudgetSkeleton />;
  }

  if (!classification || classification.status !== "ready") {
    return (
      <EmptyStatePage
        icon={AccountBalanceWalletOutlined}
        heading="Your budget will appear here"
        description="Once your accounts are connected, P.R.I.M.E. will categorize your spending and help you understand where your money goes."
      />
    );
  }

  const {
    fixed_cents,
    flexible_cents,
    fixed_pct,
    flexible_pct,
    fixed_categories,
    flexible_categories,
  } = classification;
  const totalCents = fixed_cents + flexible_cents;

  // Income context for insight
  const incomeCents =
    baseline?.status === "ready" ? baseline.monthly_income_cents : null;
  const fixedOfIncomePct =
    incomeCents ? Math.round((fixed_cents / incomeCents) * 100) : null;
  const flexOfIncomePct =
    incomeCents ? Math.round((flexible_cents / incomeCents) * 100) : null;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Overview card */}
      <Card variant="outlined" sx={{ p: 3 }}>
        <Typography
          variant="h6"
          sx={{ fontWeight: 600, color: "grey.900" }}
        >
          Monthly Spending
        </Typography>
        <Typography
          variant="body1"
          sx={{ fontWeight: 600, color: "grey.700", mt: 0.5 }}
        >
          Total: {formatCurrency(totalCents)}
        </Typography>

        {/* Ratio bar */}
        <Box
          sx={{
            display: "flex",
            mt: 2,
            height: 8,
            borderRadius: 1,
            overflow: "hidden",
          }}
        >
          <Box sx={{ width: `${fixed_pct}%`, bgcolor: "grey.400" }} />
          <Box sx={{ width: `${flexible_pct}%`, bgcolor: "primary.main" }} />
        </Box>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mt: 2,
          }}
        >
          <Typography variant="body2" sx={{ color: "grey.500" }}>
            Fixed:{" "}
            <Box
              component="span"
              sx={{ fontWeight: 600, color: "grey.700" }}
            >
              {formatCurrency(fixed_cents)}
            </Box>{" "}
            ({fixed_pct}%)
          </Typography>
          <Typography variant="body2" sx={{ color: "grey.500" }}>
            Flexible:{" "}
            <Box
              component="span"
              sx={{ fontWeight: 600, color: "primary.main" }}
            >
              {formatCurrency(flexible_cents)}
            </Box>{" "}
            ({flexible_pct}%)
          </Typography>
        </Box>

        {fixedOfIncomePct != null && flexOfIncomePct != null && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography
              variant="body2"
              sx={{ fontSize: 13, color: "grey.500", lineHeight: 1.6 }}
            >
              {fixedOfIncomePct}% of your income is committed to fixed
              expenses. You control the remaining {flexOfIncomePct}%.
            </Typography>
          </>
        )}
      </Card>

      {/* Category breakdown */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 3,
        }}
      >
        <CategoryCard
          title="Fixed Expenses"
          totalCents={fixed_cents}
          totalColor="grey.700"
          categories={fixed_categories}
        />
        <CategoryCard
          title="Flexible Spending"
          totalCents={flexible_cents}
          totalColor="primary.main"
          categories={flexible_categories}
        />
      </Box>
    </Box>
  );
}
