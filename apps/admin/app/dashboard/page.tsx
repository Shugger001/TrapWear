import Link from "next/link";
import { desc } from "drizzle-orm";
import { orders } from "@trapwear/db";
import { cookies } from "next/headers";
import { LogoutButton } from "@/components/logout-button";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function DashboardPage() {
  const recent = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(5);

  let isSuperadmin = false;
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (token) {
    try {
      const s = await verifyAdminSession(token);
      isSuperadmin = s.role === "superadmin";
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-trap-navy-900">Dashboard</h1>
          <p className="text-sm text-trap-navy-900/70">Orders, inventory hooks, and platform controls.</p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link className="font-medium text-trap-sky-700 hover:text-trap-sky-600" href="/orders">
            All orders
          </Link>
          <Link className="font-medium text-trap-sky-700 hover:text-trap-sky-600" href="/inventory">
            Inventory
          </Link>
          <Link className="font-medium text-trap-sky-700 hover:text-trap-sky-600" href="/super/flags">
            Flags
          </Link>
          <Link className="font-medium text-trap-sky-700 hover:text-trap-sky-600" href="/super/coupons">
            Coupons
          </Link>
          {isSuperadmin ? (
            <Link className="font-medium text-trap-sky-700 hover:text-trap-sky-600" href="/super/operations">
              Operations
            </Link>
          ) : null}
          <LogoutButton />
        </div>
      </header>

      <section className="rounded-2xl border border-trap-sky-100 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-trap-navy-900">Recent orders</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-trap-navy-900/50">
              <tr>
                <th className="pb-2">Order</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Total</th>
                <th className="pb-2">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-trap-sky-100">
              {recent.map((o) => (
                <tr key={o.id} className="text-trap-navy-900">
                  <td className="py-3">
                    <Link className="font-medium text-trap-sky-800 hover:underline" href={`/orders/${o.id}`}>
                      {o.id.slice(0, 8)}…
                    </Link>
                  </td>
                  <td className="py-3">{o.status}</td>
                  <td className="py-3">${(o.totalCents / 100).toFixed(2)}</td>
                  <td className="py-3 text-trap-navy-900/70">{o.createdAt.toISOString().slice(0, 10)}</td>
                </tr>
              ))}
              {recent.length === 0 ? (
                <tr>
                  <td className="py-6 text-trap-navy-900/60" colSpan={4}>
                    No orders yet — complete a test checkout on the storefront.
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
