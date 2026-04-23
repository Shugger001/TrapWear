"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";

const primaryNav = [
  { href: "/dashboard", label: "Overview", hint: "KPIs & snapshot" },
  { href: "/products", label: "Products", hint: "Bulk, duplicate & CSV" },
  { href: "/orders", label: "Orders", hint: "Fulfillment, notes & CSV" },
  { href: "/inventory", label: "Inventory", hint: "Stock levels & SKUs" },
] as const;

const superNav = [
  { href: "/super/flags", label: "System", hint: "Integrations" },
  { href: "/super/coupons", label: "Coupons", hint: "Discount controls" },
] as const;

export function AdminSidebar({
  isSuperadmin,
  onNavigate,
}: {
  isSuperadmin: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  function active(href: string): boolean {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const storefrontUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "/";

  return (
    <div className="flex h-dvh min-h-0 w-full flex-col md:h-screen">
      <div className="border-b border-slate-800/80 px-4 py-4 sm:px-5 sm:py-6">
        <div className="flex items-start justify-between gap-2">
          <Link
            href="/dashboard"
            className="block min-w-0 text-lg font-semibold tracking-tight text-white"
            onClick={onNavigate}
          >
            Karlmaxx
            <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
              Private suite
            </span>
          </Link>
          <span className="rounded-md border border-indigo-400/30 bg-indigo-500/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-100">
            Admin
          </span>
          {onNavigate ? (
            <button
              type="button"
              aria-label="Close menu"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 md:hidden"
              onClick={onNavigate}
            >
              <span className="text-lg leading-none">×</span>
            </button>
          ) : null}
        </div>
        <div className="mt-3 rounded-xl border border-slate-700/70 bg-slate-800/55 px-3 py-2">
          <p className="text-[11px] text-slate-300">
            Investment Limited · <span className="text-slate-500">internal operations</span>
          </p>
        </div>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain px-2 py-3 sm:px-3 sm:py-4">
        <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Navigate</p>
        {primaryNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active(item.href)
                ? "bg-indigo-500/20 text-indigo-100 ring-1 ring-indigo-400/40"
                : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
            }`}
          >
            <span className="block">{item.label}</span>
            <span className="block text-[11px] font-normal text-slate-500">{item.hint}</span>
          </Link>
        ))}

        <p className="mb-1 mt-6 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Platform</p>
        {superNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active(item.href)
                ? "bg-indigo-500/20 text-indigo-100 ring-1 ring-indigo-400/40"
                : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
            }`}
          >
            <span className="block">{item.label}</span>
            <span className="block text-[11px] font-normal text-slate-500">{item.hint}</span>
          </Link>
        ))}

        {isSuperadmin ? (
          <Link
            href="/super/operations"
            onClick={onNavigate}
            className={`mt-1 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active("/super/operations")
                ? "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/35"
                : "text-slate-300 hover:bg-slate-800/80 hover:text-amber-100/90"
            }`}
          >
            Operations & God console
          </Link>
        ) : null}
      </nav>

      <div className="space-y-2 border-t border-slate-800 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
        <LogoutButton variant="dark" className="w-full justify-center rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-3 text-sm hover:bg-slate-800 sm:py-2" />
        <a
          href={storefrontUrl}
          target="_blank"
          rel="noreferrer"
          onClick={onNavigate}
          className="inline-flex w-full items-center justify-center rounded-lg border border-slate-700/70 px-3 py-2 text-xs uppercase tracking-wide text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
        >
          Exit to storefront
        </a>
      </div>
    </div>
  );
}
