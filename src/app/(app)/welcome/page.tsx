"use client";

import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import SvgIcon from "@mui/material/SvgIcon";

function CheckIcon() {
  return (
    <SvgIcon sx={{ fontSize: 24, color: "#059669" }}>
      <path
        d="M20 6L9 17l-5-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SvgIcon>
  );
}

export default function WelcomePage() {
  const router = useRouter();

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#F9FAFB",
        px: 2,
      }}
    >
      <Card
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 448,
          p: { xs: 3, sm: 5 },
          borderRadius: 3,
          boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
          textAlign: "center",
        }}
      >
        <Box
          sx={{
            mx: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 48,
            height: 48,
            borderRadius: "50%",
            bgcolor: "#ECFDF5",
            animation: "scale-in 300ms ease-out",
            "@keyframes scale-in": {
              "0%": {
                transform: "scale(0.8)",
                opacity: 0,
              },
              "100%": {
                transform: "scale(1)",
                opacity: 1,
              },
            },
          }}
        >
          <CheckIcon />
        </Box>

        <Typography
          variant="h5"
          sx={{
            mt: 2,
            fontWeight: 600,
            color: "grey.900",
          }}
        >
          Your private financial workspace is ready.
        </Typography>

        <Typography
          sx={{
            mt: 1,
            fontSize: "0.875rem",
            color: "grey.500",
          }}
        >
          Your data is encrypted and only accessible by you.
        </Typography>

        <Button
          fullWidth
          variant="contained"
          disableElevation
          onClick={() => router.push("/dashboard")}
          sx={{ mt: 3, py: 1.25 }}
        >
          Continue to Dashboard
        </Button>
      </Card>
    </Box>
  );
}
