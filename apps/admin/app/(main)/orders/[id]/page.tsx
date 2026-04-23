import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { coupons, orderLines, orders, productVariants, products } from "@trapwear/db";
import { formatMoneyCents } from "@/lib/money";
import { OrderStatusForm } from "@/components/order-status-form";
import { db } from "@/lib/db";

export default async function OrderDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) notFound();

  const couponRow = order.couponId
    ? (await db.select().from(coupons).where(eq(coupons.id, order.couponId)).limit(1))[0]
    : undefined;

  const lines = await db.select().from(orderLines).where(eq(orderLines.orderId, id));

  const enriched = [];
  for (const line of lines) {
    const [row] = await db
      .select({ product: products, variant: productVariants })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(eq(productVariants.id, line.variantId))
      .limit(1);
    enriched.push({ line, product: row?.product, variant: row?.variant });
  }

  return (
    <div className="space-y-6 px-4 py-6 text-slate-100 sm:px-6 sm:py-8">
      <header className="space-y-2">
        <Link href="/orders" className="text-xs font-medium text-indigo-300 hover:text-indigo-200 hover:underline">
          ← Orders
        </Link>
        <h1 className="break-all text-xl font-semibold tracking-tight text-white sm:text-2xl">Order {order.id}</h1>
        <p className="text-sm text-slate-400">
          {order.email} · <span className="text-slate-200">{order.status}</span>
        </p>
      </header>

      <section className="rounded-2xl border border-slate-800/90 bg-slate-900/70 p-4 shadow-xl shadow-black/25 sm:p-6">
        <h2 className="text-sm font-semibold text-white">Totals</h2>
        <dl className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/30 p-3">
            <dt className="text-xs text-slate-500">Subtotal (list)</dt>
            <dd className="mt-1 font-semibold tabular-nums text-white">{formatMoneyCents(order.subtotalCents)}</dd>
          </div>
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/30 p-3">
            <dt className="text-xs text-slate-500">Discount</dt>
            <dd className="mt-1 font-semibold tabular-nums text-white">
              {order.discountCents > 0
                ? `−${formatMoneyCents(order.discountCents)}${couponRow ? ` (${couponRow.code})` : ""}`
                : "—"}
            </dd>
          </div>
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/30 p-3">
            <dt className="text-xs text-slate-500">Shipping</dt>
            <dd className="mt-1 font-semibold tabular-nums text-white">{formatMoneyCents(order.shippingCents)}</dd>
          </div>
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/30 p-3">
            <dt className="text-xs text-slate-500">Tax</dt>
            <dd className="mt-1 font-semibold tabular-nums text-white">{formatMoneyCents(order.taxCents)}</dd>
          </div>
          <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/10 p-3 sm:col-span-2 lg:col-span-1">
            <dt className="text-xs text-indigo-200/80">Total</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums text-white">{formatMoneyCents(order.totalCents)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-800/90 bg-slate-900/70 p-4 shadow-xl shadow-black/25 sm:p-6">
        <h2 className="text-sm font-semibold text-white">Lines</h2>
        <div className="mt-4 space-y-3">
          {enriched.map(({ line, product, variant }) => (
            <div key={line.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm">
              <p className="font-medium text-white">{product?.name ?? "Product"}</p>
              <p className="mt-1 text-slate-400">Variant: {variant?.label ?? line.variantId}</p>
              <p className="mt-1 text-slate-400">Qty: {line.quantity}</p>
              <p className="mt-2 text-slate-300">
                Unit: {formatMoneyCents(line.unitPriceCents)} · Line:{" "}
                {formatMoneyCents(line.unitPriceCents * line.quantity)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <OrderStatusForm orderId={order.id} status={order.status} theme="dark" />
    </div>
  );
}
