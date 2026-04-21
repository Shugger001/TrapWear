import { and, eq, gte, sql } from "drizzle-orm";
import type { Db } from "@trapwear/db";
import {
  auditLogs,
  coupons,
  orderLines,
  orders,
  paystackEvents,
  productVariants,
} from "@trapwear/db";

export type FulfillOrderPaidParams = {
  orderId: string;
  cartId: string | null | undefined;
  customerEmail: string | null | undefined;
  /** Paystack transaction id (stored in `stripe_payment_intent_id` column for legacy schema). */
  paymentTransactionId: string | null;
  /** When set, enforces webhook idempotency before fulfillment. */
  paystackWebhook?: { transactionId: string; event: string } | null;
};

/**
 * Marks an order paid, decrements stock, increments coupon redemption, writes audit log.
 * Idempotent when `order.status` is already `paid`.
 * @returns `applied: true` only when this call transitioned the order to `paid`.
 */
export async function fulfillOrderPaid(
  db: Db,
  params: FulfillOrderPaidParams,
): Promise<{ applied: boolean }> {
  let applied = false;

  await db.transaction(async (tx) => {
    if (params.paystackWebhook) {
      const [ev] = await tx
        .insert(paystackEvents)
        .values({
          paystackTransactionId: params.paystackWebhook.transactionId,
          event: params.paystackWebhook.event,
        })
        .onConflictDoNothing({ target: paystackEvents.paystackTransactionId })
        .returning({ id: paystackEvents.id });
      if (!ev) return;
    }

    const [order] = await tx.select().from(orders).where(eq(orders.id, params.orderId)).limit(1);
    if (!order) return;
    if (order.status === "paid") return;

    const lines = await tx.select().from(orderLines).where(eq(orderLines.orderId, params.orderId));

    for (const line of lines) {
      const updated = await tx
        .update(productVariants)
        .set({
          stock: sql`${productVariants.stock} - ${line.quantity}`,
        })
        .where(
          and(
            eq(productVariants.id, line.variantId),
            gte(productVariants.stock, line.quantity),
          ),
        )
        .returning({ stock: productVariants.stock });

      if (updated.length === 0) {
        throw new Error("Insufficient stock during fulfillment");
      }
    }

    await tx
      .update(orders)
      .set({
        status: "paid",
        stripePaymentIntentId: params.paymentTransactionId,
        email: params.customerEmail ?? order.email,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, params.orderId));

    if (order.couponId) {
      await tx
        .update(coupons)
        .set({ redemptionCount: sql`${coupons.redemptionCount} + 1` })
        .where(eq(coupons.id, order.couponId));
    }

    await tx.insert(auditLogs).values({
      action: "order.paid",
      entity: "order",
      entityId: params.orderId,
      meta: { paystackTransactionId: params.paymentTransactionId },
    });

    applied = true;
  });

  return { applied };
}
