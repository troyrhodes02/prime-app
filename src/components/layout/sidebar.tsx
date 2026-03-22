"use client";

import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import Typography from "@mui/material/Typography";
import DashboardOutlined from "@mui/icons-material/DashboardOutlined";
import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";
import FlagOutlined from "@mui/icons-material/FlagOutlined";
import ShoppingCartOutlined from "@mui/icons-material/ShoppingCartOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import { NavItem } from "./nav-item";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardOutlined },
  { href: "/budget", label: "Budget", icon: AccountBalanceWalletOutlined },
  { href: "/goals", label: "Goals", icon: FlagOutlined },
  { href: "/purchases", label: "Purchases", icon: ShoppingCartOutlined },
];

const BOTTOM_NAV_ITEMS = [
  { href: "/settings", label: "Settings", icon: SettingsOutlined },
];

interface SidebarProps {
  pathname: string;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

function SidebarContent({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      <Box sx={{ px: 3, py: 2.5, display: "flex", alignItems: "center", gap: 1.25 }}>
        <Typography
          sx={{
            fontSize: 18,
            fontWeight: 700,
            color: "grey.900",
            letterSpacing: "-0.02em",
          }}
        >
          P.R.I.M.E.
        </Typography>
        <Box
          component="img"
          src="/prime-logo.svg"
          alt=""
          sx={{ height: 24, width: "auto" }}
        />
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, px: 1.5, mt: 1 }}>
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            active={pathname === item.href}
            onClick={onNavigate}
          />
        ))}
      </Box>

      <Divider sx={{ mx: 1.5, my: 1 }} />

      <Box sx={{ px: 1.5 }}>
        {BOTTOM_NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            active={pathname === item.href}
            onClick={onNavigate}
          />
        ))}
      </Box>
    </>
  );
}

export function Sidebar({ pathname, mobileOpen, onMobileClose }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <Box
        component="nav"
        sx={{
          display: { xs: "none", lg: "flex" },
          flexDirection: "column",
          width: 260,
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          bgcolor: "grey.100",
          borderRight: "1px solid",
          borderColor: "grey.200",
        }}
      >
        <SidebarContent pathname={pathname} />
      </Box>

      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        anchor="left"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", lg: "none" },
          "& .MuiDrawer-paper": {
            width: 260,
            bgcolor: "grey.100",
            borderRight: "1px solid",
            borderColor: "grey.200",
          },
        }}
      >
        <SidebarContent pathname={pathname} onNavigate={onMobileClose} />
      </Drawer>
    </>
  );
}
