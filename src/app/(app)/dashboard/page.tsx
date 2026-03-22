"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import { createClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setEmail(user?.email ?? null);
      setLoading(false);
    }
    loadUser();
  }, []);

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
        {loading ? (
          <CircularProgress size={24} />
        ) : (
          <>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 600,
                color: "grey.900",
              }}
            >
              Dashboard
            </Typography>
            <Typography
              sx={{
                mt: 1,
                fontSize: "0.875rem",
                color: "grey.500",
              }}
            >
              Signed in as{" "}
              <Box
                component="span"
                sx={{ fontWeight: 500, color: "grey.700" }}
              >
                {email}
              </Box>
            </Typography>
            <Typography
              sx={{
                mt: 3,
                fontSize: "0.8125rem",
                color: "grey.400",
              }}
            >
              Your financial workspace is ready. Features are coming soon.
            </Typography>
          </>
        )}
      </Card>
    </Box>
  );
}
