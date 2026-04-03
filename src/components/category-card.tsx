"use client";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";

function formatCurrency(cents: number): string {
  const dollars = Math.abs(cents) / 100;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

interface CategoryCardProps {
  title: string;
  totalCents: number;
  totalColor: string;
  categories: Array<{ label: string; totalCents: number }>;
}

export function CategoryCard({
  title,
  totalCents,
  totalColor,
  categories,
}: CategoryCardProps) {
  return (
    <Card variant="outlined" sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, color: "grey.900" }}
        >
          {title}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: totalColor,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formatCurrency(totalCents)}
        </Typography>
      </Box>
      <Divider sx={{ my: 1.5 }} />
      {categories.map((cat, i) => (
        <Box
          key={cat.label}
          sx={{
            display: "flex",
            justifyContent: "space-between",
            py: 1.5,
            borderBottom:
              i < categories.length - 1 ? "1px solid" : "none",
            borderColor: "grey.100",
          }}
        >
          <Typography variant="body2" sx={{ color: "grey.700" }}>
            {cat.label}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: "grey.700",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatCurrency(cat.totalCents)}
          </Typography>
        </Box>
      ))}
    </Card>
  );
}
