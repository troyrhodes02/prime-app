"use client";

import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  typography: {
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
  },
  palette: {
    primary: {
      main: "#2563EB",
      dark: "#1D4ED8",
    },
    error: {
      main: "#DC2626",
    },
    success: {
      main: "#059669",
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 500,
          fontSize: "0.875rem",
          padding: "10px 16px",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            fontSize: "0.875rem",
          },
        },
      },
    },
  },
});
