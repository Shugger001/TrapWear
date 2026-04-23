import Link from "next/link";
import { desc } from "drizzle-orm";
import { coupons } from "@trapwear/db";
import { CouponActiveToggle } from "@/components/coupon-active-toggle";
import { CouponCreateForm } from "@/components/coupon-create-form";
import { formatMoneyCents } from "@/lib/money";
import { db } from "@/lib/db";

function panelClass() {
  return "rounded-2xl border border-slate-800/90 bg-slate-900/70 p-4 shadow-xl shadow-black/25 sm:p-6";
}

export default async function SuperCouponsPage() {
  const rows = await db.select().from(coupons).orderBy(desc(coupons.code));

  return (
    <div className="space-y-6 px-4 py-6 text-slate-100 sm:px-6 sm:py-8">
      <header className="space-y-3">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium">
          <Link href="/dashboard" className="text-indigo-300 hover:text-indigo-200 hover:underline">
            ← Overview
          </Link>
          <Link href="/super/flags" className="text-indigo-300 hover:text-indigo-200 hover:underline">
            Feature flags
          </Link>
          <Link href="/super/operations" className="text-indigo-300 hover:text-indigo-200 hover:underline">
            Operations
          </Link>
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Super admin · Coupons</h1>
          <p className="text-sm text-slate-400">
            Create and deactivate storefront promo codes. Redemption rules are enforced on the public checkout API.
          </p>
        </div>
      </header>

      <section className={panelClass()}>
        <h2 className="text-sm font-semibold text-white">New coupon</h2>
        <p className="mt-2 text-sm text-slate-400">
          Codes are stored uppercase. Customers enter them case-insensitively on the cart.
        </p>
        <div className="mt-4">
          <CouponCreateForm variant="dark" />
        </div>
      </section>

      <section className={panelClass()}>
        <h2 className="text-sm font-semibold text-white">All coupons</h2>

        <div className="mt-4 md:hidden space-y-3">
          {rows.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-lg shadow-black/20"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-mono text-sm font-semibold text-indigo-200">{c.code}</p>
                <CouponActiveToggle id={c.id} active={c.active} variant="dark" />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-800 pt-3 text-xs text-slate-400">
                <div>
                  <dt className="text-slate-500">Discount</dt>
                  <dd className="mt-0.5 font-medium text-slate-200">{c.percentOff}%</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Min subtotal</dt>
                  <dd className="mt-0.5 font-medium tabular-nums text-slate-200">{formatMoneyCents(c.minSubtotalCents)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Used / max</dt>
                  <dd className="mt-0.5 font-mono text-[11px] text-slate-200">
                    {c.redemptionCount} / {c.maxRedemptions ?? "∞"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Expires</dt>
                  <dd className="mt-0.5 text-slate-200">{c.expiresAt ? c.expiresAt.toISOString().slice(0, 10) : "—"}</dd>
                </div>
              </dl>
            </div>
          ))}
          {rows.length === 0 ? (
            <p className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-8 text-center text-sm text-slate-500">
              No coupons yet.
            </p>
          ) : null}
        </div>

        <div className="mt-4 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/90 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">%</th>
                <th className="px-4 py-3">Min subtotal</th>
                <th className="px-4 py-3">Used / max</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map((c) => (
                <tr key={c.id} className="text-slate-200">
                  <td className="px-4 py-3 font-mono font-medium text-indigo-200">{c.code}</td>
                  <td className="px-4 py-3">{c.percentOff}%</td>
                  <td className="px-4 py-3 tabular-nums">{formatMoneyCents(c.minSubtotalCents)}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {c.redemptionCount} / {c.maxRedemptions ?? "∞"}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{c.expiresAt ? c.expiresAt.toISOString().slice(0, 10) : "—"}</td>
                  <td className="px-4 py-3">
                    <CouponActiveToggle id={c.id} active={c.active} variant="dark" />
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No coupons yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
