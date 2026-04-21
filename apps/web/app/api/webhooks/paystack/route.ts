import { NextResponse } from "next/server";
import { clearCart } from "@/lib/cart";
import { sendPaidOrderEmailIfConfigured } from "@/lib/email/send-paid-order-email";
import { processPaystackSuccessfulCharge } from "@/lib/paystack-order";
import { getPaystackSecret, verifyPaystackSignature } from "@/lib/paystack";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = getPaystackSecret();
  if (!secret) {
    return NextResponse.json({ error: "Paystack not configured" }, { status: 503 });
  }

  const raw = await req.text();
  const sig = req.headers.get("x-paystack-signature");
  if (!verifyPaystackSignature(raw, sig, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let payload: { event?: string; data?: Record<string, unknown> };
  try {
    payload = JSON.parse(raw) as { event?: string; data?: Record<string, unknown> };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.event !== "charge.success") {
    return NextResponse.json({ received: true });
  }

  const d = payload.data as {
    id?: number;
    reference?: string;
    amount?: number;
    currency?: string;
    customer?: { email?: string | null };
    metadata?: Record<string, unknown> | null;
  };

  if (!d.reference || d.id == null || d.amount == null || !d.currency) {
    return NextResponse.json({ received: true, warning: "incomplete_payload" });
  }

  const result = await processPaystackSuccessfulCharge({
    reference: d.reference,
    paystackTransactionId: d.id,
    customerEmail: d.customer?.email ?? null,
    amount: d.amount,
    currency: d.currency,
    metadata: d.metadata ?? null,
    paystackWebhook: { transactionId: String(d.id), event: payload.event },
  });

  if (!result.ok) {
    return NextResponse.json({ received: true, warning: result.reason });
  }

  if (result.applied) {
    if (result.cartId) {
      await clearCart(result.cartId);
    }
    await sendPaidOrderEmailIfConfigured(result.orderId);
  }

  return NextResponse.json({ received: true });
}
