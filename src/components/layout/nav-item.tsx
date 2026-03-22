"use client";

import Link from "next/link";
import Box from "@mui/material/Box";

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClick?: () => void;
}

export function NavItem({ href, label, icon: Icon, active, onClick }: NavItemProps) {
  return (
    <Link href={href} onClick={onClick} style={{ textDecoration: "none" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          px: 1.5,
          py: 1,
          borderRadius: "6px",
          fontSize: "0.875rem",
          fontWeight: active ? 600 : 500,
          color: active ? "primary.main" : "grey.700",
          bgcolor: active ? "rgba(37, 99, 235, 0.08)" : "transparent",
          "&:hover": {
            bgcolor: active ? "rgba(37, 99, 235, 0.08)" : "grey.200",
          },
          transition: "background-color 150ms",
        }}
      >
        <Icon sx={{ fontSize: 20, color: active ? "primary.main" : "grey.500" }} />
        {label}
      </Box>
    </Link>
  );
}
