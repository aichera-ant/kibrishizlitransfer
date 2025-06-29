import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Toaster } from "sonner";
import "./globals.css";
import React from 'react';
// *** LEAFLET CSS İMPORTU ***
import 'leaflet/dist/leaflet.css';

// Font tanımları
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Metadata geri geldi
export const metadata: Metadata = {
  title: "Kıbrıs Transfer Rezervasyon",
  description: "Kıbrıs için hızlı ve güvenilir transfer hizmetleri.",
};

// Orijinal fonksiyon tanımı geri geldi
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head />
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground flex flex-col min-h-screen`}
      >
        <Header />
        <main className="flex-grow">
          {children}
        </main>
        <Footer />
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
} 