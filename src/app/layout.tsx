import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Sidebar } from "@/src/components/Sidebar";
import { AdsBanner } from "@/src/components/AdsBanner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "POStify - Punto de Venta",
  description: "Sistema de ventas POS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className} suppressHydrationWarning>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-h-screen bg-background overflow-x-hidden flex flex-col">
            <div className="max-w-full flex-1">
              {children}
            </div>
            <AdsBanner />
          </main>
        </div>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}