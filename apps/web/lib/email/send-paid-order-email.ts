import { eq } from "drizzle-orm";
import { orderLines, orders, productVariants, products } from "@trapwear/db";
import { db } from "@/lib/db";
import { sendOrderConfirmationEmail } from "@/lib/email/order-confirmation";

export async function sendPaidOrderEmailIfConfigured(orderId: string): Promise<void> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || order.status !== "paid") return;
  if (order.email.startsWith("pending@trapwear")) return;

  const rows = await db
    .select({
      productName: products.name,
      variantLabel: productVariants.label,
      qty: orderLines.quantity,
      unitPriceCents: orderLines.unitPriceCents,
    })
    .from(orderLines)
    .innerJoin(productVariants, eq(orderLines.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(eq(orderLines.orderId, orderId));

  const lines = rows.map((r) => ({
    title: `${r.productName} — ${r.variantLabel}`,
    qty: r.qty,
    lineTotal: `$${((r.unitPriceCents * r.qty) / 100).toFixed(2)}`,
  }));

  const result = await sendOrderConfirmationEmail({
    to: order.email,
    orderId: order.id,
    totalFormatted: `$${(order.totalCents / 100).toFixed(2)}`,
    lines,
  });

  if (!result.ok && !result.skipped) {
    console.error("[email] order confirmation failed", result.error);
  }
}
