import { eq } from "drizzle-orm";
import { fulfillOrderPaid } from "@trapwear/ops";
import { orders } from "@trapwear/db";
import { clearCart } from "@/lib/cart";
import { sendPaidOrderEmailIfConfigured } from "@/lib/email/send-paid-order-email";
import { db } from "@/lib/db";
import { paystackCurrency, paystackVerify } from "@/lib/paystack";

function pickCartId(metadata: Record<string, unknown> | null | undefined): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const m = metadata as Record<string, unknown>;
  const a = m.cart_id;
  const b = m.cartId;
  if (typeof a === "string") return a;
  if (typeof b === "string") return b;
  return null;
}

function pickOrderId(metadata: Record<string, unknown> | null | undefined): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const m = metadata as Record<string, unknown>;
  const a = m.order_id;
  const b = m.orderId;
  if (typeof a === "string") return a;
  if (typeof b === "string") return b;
  return null;
}

export async function processPaystackSuccessfulCharge(opts: {
  reference: string;
  paystackTransactionId: number | string;
  customerEmail: string | null | undefined;
  amount: number;
  currency: string;
  metadata: Record<string, unknown> | null | undefined;
  paystackWebhook?: { transactionId: string; event: string } | null;
}): Promise<
  | { ok: true; orderId: string; cartId: string | null; applied: boolean }
  | { ok: false; reason: string }
> {
  const expectedCurrency = paystackCurrency().toUpperCase();
  if (opts.currency.toUpperCase() !== expectedCurrency) {
    return { ok: false, reason: "currency_mismatch" };
  }

  let orderRow = (
    await db.select().from(orders).where(eq(orders.stripeCheckoutSessionId, opts.reference)).limit(1)
  )[0];

  if (!orderRow) {
    const oid = pickOrderId(opts.metadata);
    if (oid) {
      orderRow = (await db.select().from(orders).where(eq(orders.id, oid)).limit(1))[0];
    }
  }

  if (!orderRow) {
    return { ok: false, reason: "order_not_found" };
  }

  if (opts.amount !== orderRow.totalCents) {
    return { ok: false, reason: "amount_mismatch" };
  }

  const cartId = pickCartId(opts.metadata);

  const { applied } = await fulfillOrderPaid(db, {
    orderId: orderRow.id,
    cartId,
    customerEmail: opts.customerEmail ?? null,
    paymentTransactionId: String(opts.paystackTransactionId),
    paystackWebhook: opts.paystackWebhook ?? null,
  });

  return { ok: true, orderId: orderRow.id, cartId, applied };
}

export async function completePaystackReturn(reference: string): Promise<{
  status: "ok" | "failed" | "unverified";
  detail?: string;
}> {
  try {
    const data = await paystackVerify(reference);
    if (!data || data.status !== "success") {
      return { status: "unverified", detail: data?.status ?? "unknown" };
    }

    const email = data.customer?.email ?? null;
    const result = await processPaystackSuccessfulCharge({
      reference: data.reference,
      paystackTransactionId: data.id,
      customerEmail: email,
      amount: data.amount,
      currency: data.currency,
      metadata: data.metadata,
      paystackWebhook: null,
    });

    if (!result.ok) {
      return { status: "failed", detail: result.reason };
    }

    if (result.applied) {
      if (result.cartId) {
        await clearCart(result.cartId);
      }
      await sendPaidOrderEmailIfConfigured(result.orderId);
    }

    return { status: "ok" };
  } catch (e) {
    console.error("[paystack] completePaystackReturn", e);
    return { status: "failed", detail: "server_error" };
  }
}
