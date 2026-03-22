import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";

export function AuthCard({ children }: { children: React.ReactNode }) {
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
        }}
      >
        <Typography
          sx={{
            mb: 3,
            textAlign: "center",
            fontSize: "1.25rem",
            fontWeight: 600,
            letterSpacing: "-0.025em",
            color: "grey.900",
          }}
        >
          P.R.I.M.E.
        </Typography>
        {children}
      </Card>
    </Box>
  );
}
