import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { isPaystackConfigured } from "@/lib/paystack";

export const dynamic = "force-dynamic";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "TrapWear — Jerseys, custom kits & men’s footwear",
  description:
    "TrapWear sells premium soccer jerseys with personalization and curated men’s footwear.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const year = new Date().getFullYear();
  const paystackReady = isPaystackConfigured();
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@trapwear.com";
  const instagramUrl = process.env.NEXT_PUBLIC_INSTAGRAM_URL;
  const xUrl = process.env.NEXT_PUBLIC_X_URL;
  const whatsappUrl = process.env.NEXT_PUBLIC_WHATSAPP_URL;

  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body className="font-sans">
        <SiteHeader />
        <main className="mx-auto mt-4 max-w-6xl rounded-2xl border border-white/60 bg-white/72 px-4 pb-24 pt-8 shadow-sm backdrop-blur-[2px]">
          {children}
        </main>
        <footer className="mt-6 border-t border-trap-sky-200 bg-white/80 backdrop-blur">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 text-sm text-trap-navy-900/80 md:grid-cols-3">
            <div className="space-y-2">
              <p className="font-semibold text-trap-navy-900">TrapWear</p>
              <p>Premium jerseys, custom kits, and curated footwear.</p>
              <p>© {year} TrapWear. All rights reserved.</p>
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-trap-navy-900">Quick links</p>
              <div className="flex flex-wrap items-center gap-4">
                <Link href="/products" className="hover:text-trap-sky-600">
                  Shop
                </Link>
                <Link href="/cart" className="hover:text-trap-sky-600">
                  Cart
                </Link>
                <Link href="/account" className="hover:text-trap-sky-600">
                  Account
                </Link>
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-trap-navy-900">Connect</p>
              <div className="flex flex-wrap items-center gap-4">
                <a href={`mailto:${supportEmail}`} className="hover:text-trap-sky-600">
                  Email
                </a>
                {instagramUrl ? (
                  <a href={instagramUrl} target="_blank" rel="noreferrer" className="hover:text-trap-sky-600">
                    Instagram
                  </a>
                ) : null}
                {xUrl ? (
                  <a href={xUrl} target="_blank" rel="noreferrer" className="hover:text-trap-sky-600">
                    X
                  </a>
                ) : null}
                {whatsappUrl ? (
                  <a href={whatsappUrl} target="_blank" rel="noreferrer" className="hover:text-trap-sky-600">
                    WhatsApp
                  </a>
                ) : null}
              </div>
            </div>
          </div>
          <div className="border-t border-trap-sky-200/70">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-trap-navy-900/60">
              <span>
                {paystackReady
                  ? "Secure checkout with Paystack."
                  : "Checkout is paused until Paystack keys are added to the environment."}
              </span>
              {paystackReady ? (
                <Link href="/checkout" className="hover:text-trap-sky-600">
                  Go to checkout
                </Link>
              ) : (
                <span className="text-trap-navy-900/40">Checkout unavailable</span>
              )}
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
