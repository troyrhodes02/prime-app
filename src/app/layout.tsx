import type { Metadata } from "next";
import { IBM_Plex_Sans, Lexend } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "P.R.I.M.E.",
  description: "Your financial decision engine",
  icons: {
    icon: "/prime-tab.png",
    apple: "/prime-tab.png",
  },
  openGraph: {
    title: "P.R.I.M.E.",
    description: "Your financial decision engine",
    images: ["/prime-tab.png"],
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${ibmPlexSans.variable} ${lexend.variable}`}>
      <body>
        <ThemeProvider>
          {children}
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
