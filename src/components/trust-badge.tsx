import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { SvgIconComponent } from "@mui/icons-material";

interface TrustBadgeProps {
  icon: SvgIconComponent;
  label: string;
}

export function TrustBadge({ icon: Icon, label }: TrustBadgeProps) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        px: 1.5,
        py: 0.75,
        bgcolor: "grey.50",
        borderRadius: 1,
        border: "1px solid",
        borderColor: "grey.200",
      }}
    >
      <Icon sx={{ fontSize: 16, color: "grey.500" }} />
      <Typography variant="caption" sx={{ fontWeight: 500 }}>
        {label}
      </Typography>
    </Box>
  );
}
