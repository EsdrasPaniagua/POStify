import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/src/components/ThemeProvider";
import { Sidebar } from "@/src/components/Sidebar";
import { AdsBanner } from "@/src/components/AdsBanner";
import { UserAdsBanner } from "../components/UserAdsBanner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "POStify",
  description: "Sistema de punto de venta",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto pb-16 lg:ml-64">
        {children}
      </main>
    </div>
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 border-t lg:left-64">
      <UserAdsBanner />
    </div>
  </ThemeProvider>
</body>
    </html>
  );
}