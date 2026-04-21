import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { orders } from "@trapwear/db";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCustomerFromSession } from "@/lib/customer-session";
import { AccountLogout } from "./account-logout";

export default async function AccountPage() {
  const customer = await getCustomerFromSession();
  if (!customer) {
    redirect("/sign-in?next=/account");
  }

  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, customer.userId))
    .orderBy(desc(orders.createdAt))
    .limit(50);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-trap-navy-900">Your account</h1>
          <p className="text-sm text-trap-navy-900/70">
            {customer.name ? `${customer.name} · ` : null}
            {customer.email}
          </p>
        </div>
        <AccountLogout />
      </div>

      <section className="rounded-2xl border border-trap-sky-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-trap-navy-900">Orders</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-trap-navy-900/50">
              <tr>
                <th className="pb-2">Order</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Total</th>
                <th className="pb-2">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-trap-sky-100">
              {rows.map((o) => (
                <tr key={o.id}>
                  <td className="py-3 font-mono text-xs">{o.id.slice(0, 8)}…</td>
                  <td className="py-3">{o.status}</td>
                  <td className="py-3">${(o.totalCents / 100).toFixed(2)}</td>
                  <td className="py-3 text-trap-navy-900/70">{o.createdAt.toISOString().slice(0, 10)}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-trap-navy-900/60">
                    No orders yet.{" "}
                    <Link href="/products" className="font-medium text-trap-sky-700 hover:underline">
                      Shop
                    </Link>
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
