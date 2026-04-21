import Link from "next/link";
import { SweepStaleButton } from "@/components/sweep-stale-button";
import { LogoutButton } from "@/components/logout-button";

export default function SuperOperationsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap gap-4 text-sm">
            <Link href="/dashboard" className="font-medium text-trap-sky-700 hover:text-trap-sky-600">
              ← Dashboard
            </Link>
            <Link href="/super/coupons" className="font-medium text-trap-sky-700 hover:text-trap-sky-600">
              Coupons
            </Link>
            <Link href="/super/flags" className="font-medium text-trap-sky-700 hover:text-trap-sky-600">
              Feature flags
            </Link>
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-trap-navy-900">Super admin · Operations</h1>
          <p className="text-sm text-trap-navy-900/70">
            Manual maintenance tasks. Prefer scheduled cron for production.
          </p>
        </div>
        <LogoutButton />
      </header>

      <section className="rounded-2xl border border-trap-sky-100 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-trap-navy-900">Stale checkouts</h2>
        <p className="mt-2 text-sm text-trap-navy-900/70">
          Cancels <code className="rounded bg-trap-sky-50 px-1">pending_payment</code> orders older than{" "}
          <code className="rounded bg-trap-sky-50 px-1">STALE_CHECKOUT_MINUTES</code> (default 60, min 5). Frees coupon
          slots held by abandoned Paystack checkouts (Paystack does not expose a server-side “expire session” API).
        </p>
        <div className="mt-4">
          <SweepStaleButton />
        </div>
      </section>
    </div>
  );
}
