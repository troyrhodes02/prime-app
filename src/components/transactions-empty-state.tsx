"use client";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import AccountBalanceOutlined from "@mui/icons-material/AccountBalanceOutlined";

type Variant = "no-accounts" | "processing" | "no-results";

interface TransactionsEmptyStateProps {
  variant: Variant;
}

const config: Record<Variant, { icon: typeof ReceiptLongOutlined; heading: string; description: string; card: boolean }> = {
  "no-accounts": {
    icon: AccountBalanceOutlined,
    heading: "Connect your accounts to see transactions",
    description: "P.R.I.M.E. will automatically organize and clean your transaction history.",
    card: true,
  },
  processing: {
    icon: ReceiptLongOutlined,
    heading: "No transactions yet",
    description: "Your transactions will appear here once P.R.I.M.E. finishes processing your accounts.",
    card: true,
  },
  "no-results": {
    icon: ReceiptLongOutlined,
    heading: "No transactions match your filters.",
    description: "",
    card: false,
  },
};

export function TransactionsEmptyState({ variant }: TransactionsEmptyStateProps) {
  const { icon: Icon, heading, description, card } = config[variant];

  const content = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: card ? 6 : 6,
        px: 2.5,
      }}
    >
      {card && (
        <Icon sx={{ fontSize: 48, color: "grey.300", mb: 2 }} />
      )}
      <Typography
        variant="body2"
        sx={{
          color: "grey.500",
          textAlign: "center",
          fontWeight: card ? 600 : 400,
        }}
      >
        {heading}
      </Typography>
      {description && (
        <Typography
          variant="body2"
          sx={{ color: "grey.500", textAlign: "center", mt: 1, maxWidth: 360 }}
        >
          {description}
        </Typography>
      )}
    </Box>
  );

  if (card) {
    return (
      <Card variant="outlined" sx={{ overflow: "hidden" }}>
        {content}
      </Card>
    );
  }

  return content;
}
