import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";

interface EmptyStateCardProps {
  title: string;
  icon: React.ElementType;
  heading: string;
  description: string;
}

export function EmptyStateCard({
  title,
  icon: Icon,
  heading,
  description,
}: EmptyStateCardProps) {
  return (
    <Card variant="outlined" sx={{ p: 3, minHeight: 180 }}>
      <Typography
        variant="h6"
        sx={{ fontSize: "1rem", fontWeight: 600, color: "grey.900", mb: 2 }}
      >
        {title}
      </Typography>
      <Box
        sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 2 }}
      >
        <Icon sx={{ fontSize: 32, color: "grey.300" }} />
        <Typography
          variant="body2"
          sx={{ fontWeight: 500, color: "grey.500", mt: 1.5 }}
        >
          {heading}
        </Typography>
        <Typography variant="body2" sx={{ color: "grey.400", mt: 0.5 }}>
          {description}
        </Typography>
      </Box>
    </Card>
  );
}
