import Link from "next/link";
import { and, count, desc, eq, gt, gte, lt, sql } from "drizzle-orm";
import { orders, productVariants, products } from "@trapwear/db";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { db } from "@/lib/db";
import { formatMoneyCents } from "@/lib/money";

/** UTC calendar dates `YYYY-MM-DD` for the last 7 days (oldest → newest). */
function last7UtcDayKeys(): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function statusChipClass(status: string): string {
  if (status === "paid") return "bg-emerald-500/15 text-emerald-300 ring-emerald-500/25";
  if (status === "pending_payment") return "bg-amber-500/15 text-amber-200 ring-amber-500/25";
  if (status === "fulfilled") return "bg-sky-500/15 text-sky-200 ring-sky-500/25";
  if (status === "cancelled") return "bg-slate-600/40 text-slate-300 ring-slate-500/30";
  return "bg-slate-700/50 text-slate-200 ring-slate-600/40";
}

function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

function percent(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return (part / whole) * 100;
}

export default async function DashboardPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://trap-wear-web.vercel.app";

  const [
    orderStats,
    recent,
    productCountRow,
    productTypeRows,
    variantCountRow,
    lowStockRow,
    outOfStockRow,
    todayRow,
    paidDailyRows,
    allDailyRows,
  ] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        pendingPayment: sql<number>`count(*) filter (where status = 'pending_payment')::int`,
        paid: sql<number>`count(*) filter (where status = 'paid')::int`,
        fulfilled: sql<number>`count(*) filter (where status = 'fulfilled')::int`,
        cancelled: sql<number>`count(*) filter (where status = 'cancelled')::int`,
        paidRevenueCents: sql<number>`coalesce(sum(total_cents) filter (where status = 'paid'), 0)::int`,
      })
      .from(orders),
    db.select().from(orders).orderBy(desc(orders.createdAt)).limit(8),
    db.select({ n: count() }).from(products),
    db
      .select({
        type: products.type,
        n: count(),
      })
      .from(products)
      .groupBy(products.type),
    db.select({ n: count() }).from(productVariants),
    db
      .select({ n: count() })
      .from(productVariants)
      .where(and(gt(productVariants.stock, 0), lt(productVariants.stock, 5))),
    db.select({ n: count() }).from(productVariants).where(eq(productVariants.stock, 0)),
    db
      .select({
        allCount: sql<number>`count(*)::int`,
        paidCount: sql<number>`count(*) filter (where status = 'paid')::int`,
        pendingCount: sql<number>`count(*) filter (where status = 'pending_payment')::int`,
        paidRevenueCents: sql<number>`coalesce(sum(total_cents) filter (where status = 'paid'), 0)::int`,
      })
      .from(orders)
      .where(gte(orders.createdAt, sql`date_trunc('day', timezone('UTC', now()))::timestamptz`)),
    db
      .select({
        dayKey: sql<string>`to_char(date_trunc('day', ${orders.createdAt} at time zone 'UTC'), 'YYYY-MM-DD')`,
        revenueCents: sql<number>`coalesce(sum(${orders.totalCents}), 0)::int`,
        orderCount: sql<number>`count(*)::int`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.status, "paid"),
          gte(
            orders.createdAt,
            sql`(date_trunc('day', timezone('UTC', now())) - interval '6 days')::timestamptz`,
          ),
        ),
      )
      .groupBy(sql`date_trunc('day', ${orders.createdAt} at time zone 'UTC')`)
      .orderBy(sql`date_trunc('day', ${orders.createdAt} at time zone 'UTC')`),
    db
      .select({
        dayKey: sql<string>`to_char(date_trunc('day', ${orders.createdAt} at time zone 'UTC'), 'YYYY-MM-DD')`,
        allCount: sql<number>`count(*)::int`,
      })
      .from(orders)
      .where(
        gte(
          orders.createdAt,
          sql`(date_trunc('day', timezone('UTC', now())) - interval '6 days')::timestamptz`,
        ),
      )
      .groupBy(sql`date_trunc('day', ${orders.createdAt} at time zone 'UTC')`)
      .orderBy(sql`date_trunc('day', ${orders.createdAt} at time zone 'UTC')`),
  ]);

  const stats = orderStats[0] ?? {
    total: 0,
    pendingPayment: 0,
    paid: 0,
    fulfilled: 0,
    cancelled: 0,
    paidRevenueCents: 0,
  };

  const totalOrders = Number(stats.total ?? 0);
  const pendingCount = Number(stats.pendingPayment ?? 0);
  const paidCount = Number(stats.paid ?? 0);
  const fulfilledCount = Number(stats.fulfilled ?? 0);
  const paidRevenueCents = Number(stats.paidRevenueCents ?? 0);
  const productCount = Number(productCountRow[0]?.n ?? 0);
  const productsByType = new Map(productTypeRows.map((r) => [r.type, Number(r.n ?? 0)]));
  const jerseyCount = productsByType.get("jersey") ?? 0;
  const footwearCount = productsByType.get("footwear") ?? 0;
  const variantCount = Number(variantCountRow[0]?.n ?? 0);
  const lowStockSkus = Number(lowStockRow[0]?.n ?? 0);
  const outOfStockSkus = Number(outOfStockRow[0]?.n ?? 0);
  const todayAllOrders = Number(todayRow[0]?.allCount ?? 0);
  const todayPaidOrders = Number(todayRow[0]?.paidCount ?? 0);
  const todayPendingOrders = Number(todayRow[0]?.pendingCount ?? 0);
  const todayPaidRevenueCents = Number(todayRow[0]?.paidRevenueCents ?? 0);
  const todayCheckoutCompletionPct = percent(todayPaidOrders, todayAllOrders);
  const todayPendingSharePct = percent(todayPendingOrders, todayAllOrders);
  const avgPaidOrderValueCents = paidCount > 0 ? Math.round(paidRevenueCents / paidCount) : 0;

  const dayKeys = last7UtcDayKeys();
  const byDay = new Map(
    paidDailyRows.map((r) => [r.dayKey, { revenueCents: Number(r.revenueCents ?? 0), orderCount: Number(r.orderCount ?? 0) }]),
  );
  const allByDay = new Map(allDailyRows.map((r) => [r.dayKey, Number(r.allCount ?? 0)]));
  const paidLast7Days = dayKeys.map((day) => ({
    day,
    revenueCents: byDay.get(day)?.revenueCents ?? 0,
    orderCount: byDay.get(day)?.orderCount ?? 0,
    allOrderCount: allByDay.get(day) ?? 0,
  }));
  const maxDayRevenue = Math.max(1, ...paidLast7Days.map((d) => d.revenueCents));
  const weekAllOrders = paidLast7Days.reduce((s, d) => s + d.allOrderCount, 0);

  let isSuperadmin = false;
  let actorLabel = "admin@trapwear";
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (token) {
    try {
      const s = await verifyAdminSession(token);
      isSuperadmin = s.role === "superadmin";
      actorLabel = s.userId;
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1160px] px-4 py-4 sm:px-6 sm:py-5">
      <div className="space-y-3">
        <header className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-500">Karlmaxx private dashboard</p>
              <h1 className="mt-1 text-5xl font-semibold tracking-tight text-slate-900">Overview</h1>
              <p className="mt-2 text-sm text-slate-500">
                {productCount} products · {totalOrders} orders · {variantCount} skus
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-700">
                {isSuperadmin ? "Privileged" : "Admin"}
              </span>
              <span className="hidden rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 sm:inline">
                {actorLabel}
              </span>
              <LogoutButton
                variant="light"
                className="rounded-md border border-slate-200 px-3 py-1.5 text-[11px] uppercase tracking-wider"
              />
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Command center</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-4xl font-semibold tabular-nums text-slate-900">{formatMoneyCents(todayPaidRevenueCents)}</p>
              <p className="mt-2 text-xs uppercase tracking-wider text-slate-500">Paid order revenue</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-4xl font-semibold tabular-nums text-slate-900">{todayPaidOrders}</p>
              <p className="mt-2 text-xs uppercase tracking-wider text-slate-500">Paid orders</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-4xl font-semibold tabular-nums text-slate-900">{pendingCount}</p>
              <p className="mt-2 text-xs uppercase tracking-wider text-slate-500">Pending orders</p>
              {todayAllOrders > 0 ? (
                <p className="mt-1 text-[11px] text-slate-400">{todayPendingSharePct.toFixed(0)}% of today’s orders</p>
              ) : null}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-4xl font-semibold tabular-nums text-slate-900">{fulfilledCount}</p>
              <p className="mt-2 text-xs uppercase tracking-wider text-slate-500">Fulfilled (all time)</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-4xl font-semibold tabular-nums text-slate-900">{formatMoneyCents(avgPaidOrderValueCents)}</p>
              <p className="mt-2 text-xs uppercase tracking-wider text-slate-500">Avg paid order</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-4xl font-semibold tabular-nums text-slate-900">{productCount}</p>
              <p className="mt-2 text-xs uppercase tracking-wider text-slate-500">Products live</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-4xl font-semibold tabular-nums text-slate-900">{variantCount}</p>
              <p className="mt-2 text-xs uppercase tracking-wider text-slate-500">Featured SKUs</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-4xl font-semibold tabular-nums text-slate-900">{todayCheckoutCompletionPct.toFixed(0)}%</p>
              <p className="mt-2 text-xs uppercase tracking-wider text-slate-500">Checkout conversion</p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Paid revenue (7 days)</h3>
            <p className="mt-1 text-xs text-slate-500">{weekAllOrders} orders (all statuses) in range</p>
            <div className="mt-3 flex h-32 gap-1.5 sm:gap-2">
              {paidLast7Days.map((d) => {
                const hPct = maxDayRevenue > 0 ? (d.revenueCents / maxDayRevenue) * 100 : 0;
                return (
                  <div key={d.day} className="flex min-h-0 min-w-0 flex-1 flex-col">
                    <div className="flex min-h-0 flex-1 flex-col justify-end">
                      <div
                        className="w-full rounded-t-md bg-indigo-500/85"
                        style={{
                          height: `${Math.max(hPct, d.revenueCents > 0 ? 8 : 0)}%`,
                          minHeight: d.revenueCents > 0 ? 4 : 0,
                        }}
                        title={`${d.day}: ${formatMoneyCents(d.revenueCents)} · ${d.orderCount} paid`}
                      />
                    </div>
                    <span className="mt-1 shrink-0 text-center text-[10px] text-slate-500">{d.day.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 space-y-6">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Inventory alerts</h3>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                <li>{lowStockSkus} low-stock variant(s) need replenishment</li>
                <li>{outOfStockSkus} variant(s) are currently out of stock</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Catalog by category</h3>
              <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-2 text-left">Category</th>
                      <th className="px-4 py-2 text-left">Products</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-slate-200">
                      <td className="px-4 py-2 capitalize text-slate-700">Jersey</td>
                      <td className="px-4 py-2 tabular-nums text-slate-900">{jerseyCount}</td>
                    </tr>
                    <tr className="border-t border-slate-200">
                      <td className="px-4 py-2 capitalize text-slate-700">Footwear</td>
                      <td className="px-4 py-2 tabular-nums text-slate-900">{footwearCount}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Recent orders</h3>
              {recent.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No orders yet.</p>
              ) : (
                <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-2 text-left">Order</th>
                        <th className="px-4 py-2 text-left">Status</th>
                        <th className="px-4 py-2 text-left">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.slice(0, 5).map((o) => (
                        <tr key={o.id} className="border-t border-slate-200">
                          <td className="px-4 py-2">
                            <Link href={`/orders/${o.id}`} className="font-mono text-xs text-indigo-600 hover:underline">
                              {o.id.slice(0, 8)}…
                            </Link>
                          </td>
                          <td className="px-4 py-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs ring-1 ${statusChipClass(o.status)}`}>
                              {statusLabel(o.status)}
                            </span>
                          </td>
                          <td className="px-4 py-2 tabular-nums text-slate-900">{formatMoneyCents(o.totalCents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/orders" className="rounded-md border border-slate-300 px-3 py-2 text-xs uppercase tracking-wider text-slate-700 hover:bg-slate-100">
                  View all orders
                </Link>
                <a
                  href={siteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md px-3 py-2 text-xs uppercase tracking-wider text-indigo-700 underline"
                >
                  Open storefront
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
