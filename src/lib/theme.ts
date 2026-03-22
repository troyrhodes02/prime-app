"use client";

import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  typography: {
    fontFamily: "var(--font-ibm-plex-sans), system-ui, sans-serif",
    h1: { fontFamily: "var(--font-space-grotesk), system-ui, sans-serif" },
    h2: { fontFamily: "var(--font-space-grotesk), system-ui, sans-serif" },
    h3: { fontFamily: "var(--font-space-grotesk), system-ui, sans-serif" },
    h4: { fontFamily: "var(--font-space-grotesk), system-ui, sans-serif" },
    h5: { fontFamily: "var(--font-space-grotesk), system-ui, sans-serif" },
    h6: { fontFamily: "var(--font-space-grotesk), system-ui, sans-serif" },
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
