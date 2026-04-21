import Link from "next/link";
import { desc } from "drizzle-orm";
import { coupons } from "@trapwear/db";
import { CouponActiveToggle } from "@/components/coupon-active-toggle";
import { CouponCreateForm } from "@/components/coupon-create-form";
import { LogoutButton } from "@/components/logout-button";
import { db } from "@/lib/db";

export default async function SuperCouponsPage() {
  const rows = await db.select().from(coupons).orderBy(desc(coupons.code));

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap gap-4 text-sm">
            <Link href="/dashboard" className="font-medium text-trap-sky-700 hover:text-trap-sky-600">
              ← Dashboard
            </Link>
            <Link href="/super/flags" className="font-medium text-trap-sky-700 hover:text-trap-sky-600">
              Feature flags
            </Link>
            <Link href="/super/operations" className="font-medium text-trap-sky-700 hover:text-trap-sky-600">
              Operations
            </Link>
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-trap-navy-900">Super admin · Coupons</h1>
          <p className="text-sm text-trap-navy-900/70">
            Create and deactivate storefront promo codes. Redemption rules are enforced on the public checkout API.
          </p>
        </div>
        <LogoutButton />
      </header>

      <section className="rounded-2xl border border-trap-sky-100 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-trap-navy-900">New coupon</h2>
        <p className="mt-2 text-sm text-trap-navy-900/70">
          Codes are stored uppercase. Customers enter them case-insensitively on the cart.
        </p>
        <div className="mt-4">
          <CouponCreateForm />
        </div>
      </section>

      <section className="rounded-2xl border border-trap-sky-100 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-trap-navy-900">All coupons</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-trap-sky-100 text-xs uppercase text-trap-navy-900/50">
              <tr>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">%</th>
                <th className="px-3 py-2">Min subtotal</th>
                <th className="px-3 py-2">Used / max</th>
                <th className="px-3 py-2">Expires</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-trap-sky-100">
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-3 font-mono font-medium">{c.code}</td>
                  <td className="px-3 py-3">{c.percentOff}%</td>
                  <td className="px-3 py-3">${(c.minSubtotalCents / 100).toFixed(2)}</td>
                  <td className="px-3 py-3 font-mono text-xs">
                    {c.redemptionCount}
                    {" / "}
                    {c.maxRedemptions ?? "∞"}
                  </td>
                  <td className="px-3 py-3 text-trap-navy-900/70">
                    {c.expiresAt ? c.expiresAt.toISOString().slice(0, 10) : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <CouponActiveToggle id={c.id} active={c.active} />
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-trap-navy-900/60">
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
