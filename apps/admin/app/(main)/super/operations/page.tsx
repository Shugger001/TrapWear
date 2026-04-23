import Link from "next/link";
import { GodConsole } from "@/components/god-console";
import { SweepStaleButton } from "@/components/sweep-stale-button";

export default function SuperOperationsPage() {
  return (
    <div className="space-y-6 px-4 py-6 text-slate-100 sm:px-6 sm:py-8">
      <header className="space-y-3">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium">
          <Link href="/dashboard" className="text-indigo-300 hover:text-indigo-200 hover:underline">
            ← Overview
          </Link>
          <Link href="/super/coupons" className="text-indigo-300 hover:text-indigo-200 hover:underline">
            Coupons
          </Link>
          <Link href="/super/flags" className="text-indigo-300 hover:text-indigo-200 hover:underline">
            Feature flags
          </Link>
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Super admin · Operations</h1>
          <p className="text-sm text-slate-400">Manual maintenance tasks. Prefer scheduled cron for production.</p>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-800/90 bg-slate-900/70 p-4 shadow-xl shadow-black/25 sm:p-6">
        <h2 className="text-sm font-semibold text-white">Stale checkouts</h2>
        <p className="mt-2 text-sm text-slate-400">
          Cancels{" "}
          <code className="rounded bg-slate-950 px-1.5 py-0.5 font-mono text-[11px] text-indigo-200">pending_payment</code>{" "}
          orders older than{" "}
          <code className="rounded bg-slate-950 px-1.5 py-0.5 font-mono text-[11px] text-indigo-200">STALE_CHECKOUT_MINUTES</code>{" "}
          (default 60, min 5). Frees coupon slots held by abandoned Paystack checkouts (Paystack does not expose a server-side
          “expire session” API).
        </p>
        <div className="mt-4">
          <SweepStaleButton variant="dark" />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800/90 bg-slate-900/70 p-4 shadow-xl shadow-black/25 sm:p-6">
        <h2 className="text-sm font-semibold text-white">God console</h2>
        <p className="mt-2 text-sm text-slate-400">
          Superadmin-only controls for system status, maintenance mode, and user role escalation.
        </p>
        <div className="mt-4">
          <GodConsole variant="dark" />
        </div>
      </section>
    </div>
  );
}
