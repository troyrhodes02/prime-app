"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "./sidebar";
import { AppHeader } from "./app-header";

const ROUTE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/budget": "Budget",
  "/goals": "Goals",
  "/purchases": "Purchases",
  "/settings": "Settings",
};

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const pageTitle = ROUTE_TITLES[pathname] ?? "P.R.I.M.E.";

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserEmail(user?.email ?? null);
    }
    loadUser();
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Signed out");
      router.push("/login");
    } catch {
      toast.error("Failed to sign out. Please try again.");
      setLoggingOut(false);
    }
  }

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar
        pathname={pathname}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <Box sx={{ flexGrow: 1, ml: { xs: 0, lg: "260px" } }}>
        <AppHeader
          title={pageTitle}
          userEmail={userEmail}
          onMenuClick={() => setMobileOpen(true)}
          onLogout={handleLogout}
          loggingOut={loggingOut}
        />
        <Box
          component="main"
          sx={{
            p: { xs: 2, lg: 3 },
            bgcolor: "grey.50",
            minHeight: "calc(100vh - 64px)",
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
