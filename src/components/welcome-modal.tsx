"use client";

import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import SvgIcon from "@mui/material/SvgIcon";
import Typography from "@mui/material/Typography";

function CheckIcon() {
  return (
    <SvgIcon sx={{ fontSize: 24, color: "#059669" }}>
      <path
        d="M20 6L9 17l-5-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SvgIcon>
  );
}

interface WelcomeModalProps {
  open: boolean;
  onClose: () => void;
}

export function WelcomeModal({ open, onClose }: WelcomeModalProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth disableEscapeKeyDown>
      <Box sx={{ p: 5, textAlign: "center" }}>
        <Box
          sx={{
            mx: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 48,
            height: 48,
            borderRadius: "50%",
            bgcolor: "#ECFDF5",
          }}
        >
          <CheckIcon />
        </Box>
        <Typography variant="h5" sx={{ mt: 2, fontWeight: 600, color: "grey.900" }}>
          Your private financial workspace is ready.
        </Typography>
        <Typography sx={{ mt: 1, fontSize: "0.875rem", color: "grey.500" }}>
          Your data is encrypted and only accessible by you.
        </Typography>
        <Button
          fullWidth
          variant="contained"
          disableElevation
          onClick={onClose}
          sx={{ mt: 3, py: 1.25 }}
        >
          Continue to Dashboard
        </Button>
      </Box>
    </Dialog>
  );
}
