import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";

interface EmptyStatePageProps {
  icon: React.ElementType;
  heading: string;
  description: string;
}

export function EmptyStatePage({ icon: Icon, heading, description }: EmptyStatePageProps) {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
      <Card
        variant="outlined"
        sx={{ py: "60px", px: 5, textAlign: "center", maxWidth: 480, width: "100%" }}
      >
        <Icon sx={{ fontSize: 48, color: "grey.400" }} />
        <Typography
          variant="h6"
          sx={{ fontWeight: 600, color: "grey.900", mt: 2 }}
        >
          {heading}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "grey.500", mt: 1, maxWidth: 360, mx: "auto" }}
        >
          {description}
        </Typography>
      </Card>
    </Box>
  );
}
