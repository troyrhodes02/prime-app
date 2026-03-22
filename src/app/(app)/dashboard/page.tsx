import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export default function DashboardPage() {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "calc(100vh - 64px - 48px)",
      }}
    >
      <Typography
        sx={{
          fontSize: "0.8125rem",
          color: "grey.400",
        }}
      >
        Your financial workspace is ready. Features are coming soon.
      </Typography>
    </Box>
  );
}
