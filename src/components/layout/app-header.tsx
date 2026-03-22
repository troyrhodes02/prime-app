"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import MenuOutlined from "@mui/icons-material/MenuOutlined";
import LogoutOutlined from "@mui/icons-material/LogoutOutlined";

interface AppHeaderProps {
  title: string;
  userEmail: string | null;
  onMenuClick: () => void;
  onLogout: () => void;
  loggingOut?: boolean;
}

export function AppHeader({
  title,
  userEmail,
  onMenuClick,
  onLogout,
  loggingOut,
}: AppHeaderProps) {
  return (
    <Box
      component="header"
      sx={{
        height: 64,
        bgcolor: "common.white",
        borderBottom: "1px solid",
        borderColor: "grey.200",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: { xs: 2, lg: 3 },
        position: "sticky",
        top: 0,
        zIndex: (theme) => theme.zIndex.appBar,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <IconButton
          onClick={onMenuClick}
          size="small"
          sx={{ display: { xs: "flex", lg: "none" }, color: "grey.500" }}
        >
          <MenuOutlined fontSize="small" />
        </IconButton>
        <Typography
          variant="h5"
          sx={{ fontWeight: 600, color: "grey.900", letterSpacing: "-0.01em" }}
        >
          {title}
        </Typography>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        {userEmail && (
          <Typography
            variant="body2"
            sx={{
              color: "grey.500",
              maxWidth: 200,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              display: { xs: "none", sm: "block" },
            }}
          >
            {userEmail}
          </Typography>
        )}
        <IconButton
          onClick={onLogout}
          disabled={loggingOut}
          size="small"
          sx={{ color: "grey.500", "&:hover": { color: "grey.700" } }}
        >
          <LogoutOutlined fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}
