import Link from "next/link";
import { desc, gte, sql } from "drizzle-orm";
import { orders } from "@trapwear/db";
import { formatMoneyCents } from "@/lib/money";
import { db } from "@/lib/db";

function statusClass(status: string): string {
  if (status === "paid") return "bg-emerald-500/15 text-emerald-300 ring-emerald-500/25";
  if (status === "pending_payment") return "bg-amber-500/15 text-amber-200 ring-amber-500/25";
  if (status === "fulfilled") return "bg-sky-500/15 text-sky-200 ring-sky-500/25";
  if (status === "cancelled") return "bg-slate-600/40 text-slate-300 ring-slate-500/30";
  return "bg-slate-700/50 text-slate-200 ring-slate-600/40";
}

function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

type OrdersPageProps = {
  searchParams: Promise<{ days?: string }>;
};

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const sp = await searchParams;
  const parsed = Number.parseInt(String(sp.days ?? ""), 10);
  const daysFilter =
    Number.isFinite(parsed) && parsed >= 1 ? Math.min(Math.floor(parsed), 90) : null;

  const rows =
    daysFilter !== null
      ? await db
          .select()
          .from(orders)
          .where(
            gte(
              orders.createdAt,
              sql`(date_trunc('day', timezone('UTC', now())) - (${daysFilter} - 1) * interval '1 day')::timestamptz`,
            ),
          )
          .orderBy(desc(orders.createdAt))
          .limit(500)
      : await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(100);

  return (
    <div className="space-y-6 px-4 py-6 text-slate-100 sm:px-6 sm:py-8">
      <header className="space-y-3">
        <Link href="/dashboard" className="text-xs font-medium text-indigo-300 hover:text-indigo-200 hover:underline">
          ← Overview
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-white">Orders</h1>
            <p className="text-sm text-slate-400">Fulfillment queue and payment states.</p>
            {daysFilter !== null ? (
              <p className="text-xs text-indigo-200/90">
                Filter: last <span className="font-semibold tabular-nums">{daysFilter}</span> UTC day(s) · up to 500
                rows
              </p>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap justify-end gap-1.5">
              <Link
                href="/orders?days=7"
                className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${
                  daysFilter === 7
                    ? "bg-indigo-500/20 text-indigo-200 ring-indigo-400/40"
                    : "text-slate-400 ring-slate-600 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                7 days
              </Link>
              <Link
                href="/orders?days=30"
                className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${
                  daysFilter === 30
                    ? "bg-indigo-500/20 text-indigo-200 ring-indigo-400/40"
                    : "text-slate-400 ring-slate-600 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                30 days
              </Link>
              <Link
                href="/orders"
                className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${
                  daysFilter === null
                    ? "bg-indigo-500/20 text-indigo-200 ring-indigo-400/40"
                    : "text-slate-400 ring-slate-600 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                Latest 100
              </Link>
            </div>
            {daysFilter !== null ? (
              <Link href="/orders" className="text-xs font-medium text-slate-400 hover:text-indigo-200 hover:underline">
                Clear date filter
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <div className="md:hidden space-y-3">
        {rows.map((o) => (
          <Link
            key={o.id}
            href={`/orders/${o.id}`}
            className="block rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg shadow-black/20 active:bg-slate-800/80"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs text-indigo-200">{o.id.slice(0, 8)}…</p>
                <p className="mt-1 truncate text-sm text-slate-300">{o.email}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${statusClass(o.status)}`}
              >
                {statusLabel(o.status)}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-3 text-sm">
              <span className="font-semibold tabular-nums text-white">{formatMoneyCents(o.totalCents)}</span>
              <span className="text-xs tabular-nums text-slate-500">{o.createdAt.toISOString().slice(0, 16).replace("T", " ")}</span>
            </div>
          </Link>
        ))}
        {rows.length === 0 ? (
          <p className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-8 text-center text-sm text-slate-500">
            No orders in this range.
          </p>
        ) : null}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-slate-800/90 bg-slate-900/70 shadow-xl shadow-black/25 md:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-800 bg-slate-900/90 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((o) => (
              <tr key={o.id} className="text-slate-200">
                <td className="px-4 py-3">
                  <Link className="font-mono text-xs font-medium text-indigo-300 hover:underline" href={`/orders/${o.id}`}>
                    {o.id}
                  </Link>
                </td>
                <td className="max-w-[200px] truncate px-4 py-3 text-slate-300">{o.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${statusClass(o.status)}`}
                  >
                    {statusLabel(o.status)}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium tabular-nums text-white">{formatMoneyCents(o.totalCents)}</td>
                <td className="px-4 py-3 text-xs tabular-nums text-slate-500">{o.createdAt.toISOString().slice(0, 19)}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-slate-500" colSpan={5}>
                  No orders in this range.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
