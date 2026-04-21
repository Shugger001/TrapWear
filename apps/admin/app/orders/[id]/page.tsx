import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { coupons, orderLines, orders, productVariants, products } from "@trapwear/db";
import { LogoutButton } from "@/components/logout-button";
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
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Link href="/orders" className="text-sm font-medium text-trap-sky-700 hover:text-trap-sky-600">
            ← Orders
          </Link>
          <h1 className="text-2xl font-semibold text-trap-navy-900">Order {order.id}</h1>
          <p className="text-sm text-trap-navy-900/70">
            {order.email} · {order.status}
          </p>
        </div>
        <LogoutButton />
      </header>

      <section className="rounded-2xl border border-trap-sky-100 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-trap-navy-900">Totals</h2>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
          <div>
            <dt className="text-trap-navy-900/60">Subtotal (list)</dt>
            <dd className="font-medium">${(order.subtotalCents / 100).toFixed(2)}</dd>
          </div>
          <div>
            <dt className="text-trap-navy-900/60">Discount</dt>
            <dd className="font-medium">
              {order.discountCents > 0
                ? `−$${(order.discountCents / 100).toFixed(2)}${couponRow ? ` (${couponRow.code})` : ""}`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-trap-navy-900/60">Shipping</dt>
            <dd className="font-medium">${(order.shippingCents / 100).toFixed(2)}</dd>
          </div>
          <div>
            <dt className="text-trap-navy-900/60">Tax</dt>
            <dd className="font-medium">${(order.taxCents / 100).toFixed(2)}</dd>
          </div>
          <div>
            <dt className="text-trap-navy-900/60">Total</dt>
            <dd className="font-medium">${(order.totalCents / 100).toFixed(2)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-trap-sky-100 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-trap-navy-900">Lines</h2>
        <div className="mt-4 space-y-3">
          {enriched.map(({ line, product, variant }) => (
            <div key={line.id} className="rounded-xl border border-trap-sky-100 p-4 text-sm">
              <p className="font-medium text-trap-navy-900">{product?.name ?? "Product"}</p>
              <p className="text-trap-navy-900/70">Variant: {variant?.label ?? line.variantId}</p>
              <p className="text-trap-navy-900/70">Qty: {line.quantity}</p>
              <p className="mt-2 text-trap-navy-900/80">
                Unit: ${(line.unitPriceCents / 100).toFixed(2)} · Line: $
                {((line.unitPriceCents * line.quantity) / 100).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <OrderStatusForm orderId={order.id} status={order.status} />
    </div>
  );
}
