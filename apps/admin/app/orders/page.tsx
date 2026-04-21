import Link from "next/link";
import { desc } from "drizzle-orm";
import { orders } from "@trapwear/db";
import { LogoutButton } from "@/components/logout-button";
import { db } from "@/lib/db";

export default async function OrdersPage() {
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(100);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-trap-navy-900">Orders</h1>
          <p className="text-sm text-trap-navy-900/70">Fulfillment queue and payment states.</p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <Link className="font-medium text-trap-sky-700 hover:text-trap-sky-600" href="/dashboard">
            Dashboard
          </Link>
          <LogoutButton />
        </div>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-trap-sky-100 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-trap-sky-100 text-xs uppercase text-trap-navy-900/50">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-trap-sky-100">
            {rows.map((o) => (
              <tr key={o.id} className="text-trap-navy-900">
                <td className="px-4 py-3">
                  <Link className="font-medium text-trap-sky-800 hover:underline" href={`/orders/${o.id}`}>
                    {o.id}
                  </Link>
                </td>
                <td className="px-4 py-3">{o.email}</td>
                <td className="px-4 py-3">{o.status}</td>
                <td className="px-4 py-3">${(o.totalCents / 100).toFixed(2)}</td>
                <td className="px-4 py-3 text-trap-navy-900/70">{o.createdAt.toISOString()}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-trap-navy-900/60" colSpan={5}>
                  No orders yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
