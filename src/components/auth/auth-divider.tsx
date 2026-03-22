import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";

export function AuthDivider() {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, my: 3 }}>
      <Divider sx={{ flex: 1 }} />
      <Typography
        sx={{
          fontSize: "0.75rem",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "grey.400",
        }}
      >
        or
      </Typography>
      <Divider sx={{ flex: 1 }} />
    </Box>
  );
}
