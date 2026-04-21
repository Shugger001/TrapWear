import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

export const dynamic = "force-dynamic";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "TrapWear — Jerseys, custom kits & men’s footwear",
  description:
    "TrapWear sells premium soccer jerseys with personalization and curated men’s footwear.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body className="font-sans">
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-8">{children}</main>
      </body>
    </html>
  );
}
