import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/src/components/ThemeProvider";
import { Sidebar } from "@/src/components/Sidebar";
import { UserAdsBanner } from "../components/UserAdsBanner";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "POStify",
  description: "Sistema de punto de venta",
  other: {
    'google-adsense-account': 'ca-pub-4465711555804592',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4465711555804592"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}