import { and, count, eq } from "drizzle-orm";
import { lineUnitPriceCents } from "@trapwear/core";
import { coupons, customizationTemplates, orderLines, orders, productVariants, products } from "@trapwear/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { cartTotals, loadCartLines, getOrCreateCartId, cartCookieOptions } from "@/lib/cart";
import { getCartIdFromCookie, CART_COOKIE } from "@/lib/cart-cookie";
import { validateCouponForCart } from "@/lib/coupon-validate";
import { getCustomerFromSession } from "@/lib/customer-session";
import { db } from "@/lib/db";
import { getPaystackSecret, paystackCurrency, paystackInitialize } from "@/lib/paystack";
import { cookies } from "next/headers";

const bodySchema = z.object({
  email: z.string().email().optional(),
  couponCode: z.string().optional(),
});

function paystackReferenceForOrder(orderId: string): string {
  const compact = orderId.replace(/-/g, "");
  return `TW${compact}`;
}

export async function POST(req: Request) {
  if (!getPaystackSecret()) {
    return NextResponse.json(
      { error: "Paystack is not configured. Set PAYSTACK_SECRET_KEY." },
      { status: 503 },
    );
  }

  const json = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const cartId = await getOrCreateCartId(await getCartIdFromCookie());
  cookieStore.set(CART_COOKIE, cartId, cartCookieOptions());

  const baseTotals = await cartTotals(cartId);
  if (baseTotals.lines.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  const lines = await loadCartLines(cartId);

  let discountCents = 0;
  let couponId: string | null = null;
  let shippingCents = baseTotals.shippingCents;
  let taxCents = baseTotals.taxCents;
  let totalCents = baseTotals.totalCents;

  if (parsed.data.couponCode?.trim()) {
    const v = await validateCouponForCart(parsed.data.couponCode, lines);
    if (!v.ok) {
      return NextResponse.json({ error: v.error }, { status: 400 });
    }
    discountCents = v.coupon.discountCents;
    couponId = v.coupon.id;
    shippingCents = v.coupon.totals.shippingCents;
    taxCents = v.coupon.totals.taxCents;
    totalCents = v.coupon.totals.totalCents;
  }

  for (const line of lines) {
    const [variantRow] = await db.select().from(productVariants).where(eq(productVariants.id, line.variantId)).limit(1);
    if (!variantRow || variantRow.stock < line.quantity) {
      return NextResponse.json({ error: "Inventory no longer available for one or more items." }, { status: 409 });
    }
  }

  const customer = await getCustomerFromSession();
  const emailForOrder =
    (parsed.data.email?.trim() || customer?.email) ?? "pending@trapwear.local";

  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  let result: { id: string } | undefined;
  try {
    result = await db.transaction(async (tx) => {
      if (couponId) {
        const [locked] = await tx
          .select()
          .from(coupons)
          .where(eq(coupons.id, couponId))
          .for("update")
          .limit(1);
        if (!locked) {
          throw new Error("COUPON_NOT_FOUND");
        }

        const [pendingRow] = await tx
          .select({ n: count() })
          .from(orders)
          .where(and(eq(orders.couponId, couponId), eq(orders.status, "pending_payment")));

        const pending = Number(pendingRow?.n ?? 0);
        if (
          locked.maxRedemptions != null &&
          locked.redemptionCount + pending >= locked.maxRedemptions
        ) {
          throw new Error("COUPON_REDEMPTION_LIMIT");
        }
      }

      const [order] = await tx
        .insert(orders)
        .values({
          userId: customer?.userId ?? null,
          email: emailForOrder,
          status: "pending_payment",
          couponId,
          subtotalCents: baseTotals.subtotalCents,
          discountCents,
          shippingCents,
          taxCents,
          totalCents,
        })
        .returning();

      if (!order) throw new Error("Order create failed");

      for (const line of lines) {
        const [row] = await tx
          .select({
            product: products,
            variant: productVariants,
          })
          .from(productVariants)
          .innerJoin(products, eq(productVariants.productId, products.id))
          .where(eq(productVariants.id, line.variantId))
          .limit(1);

        if (!row) throw new Error("Variant missing");

        const tmpl = await tx
          .select()
          .from(customizationTemplates)
          .where(eq(customizationTemplates.productId, row.product.id))
          .limit(1);

        const schema = tmpl[0]?.schema ?? null;
        const unit = lineUnitPriceCents({
          basePriceCents: row.product.basePriceCents,
          priceModifierCents: row.variant.priceModifierCents,
          customizationSchema: schema,
          customization: line.customization,
        });
        if (!unit.ok) throw new Error(unit.error);

        await tx.insert(orderLines).values({
          orderId: order.id,
          variantId: line.variantId,
          quantity: line.quantity,
          unitPriceCents: unit.unitPriceCents,
          customization: line.customization,
        });
      }

      return order;
    });
  } catch (e) {
    if (e instanceof Error && e.message === "COUPON_REDEMPTION_LIMIT") {
      return NextResponse.json(
        { error: "This promo code has reached its redemption limit." },
        { status: 409 },
      );
    }
    if (e instanceof Error && e.message === "COUPON_NOT_FOUND") {
      return NextResponse.json({ error: "This promo code is no longer available." }, { status: 400 });
    }
    throw e;
  }

  if (!result) {
    return NextResponse.json({ error: "Order could not be created." }, { status: 500 });
  }

  const reference = paystackReferenceForOrder(result.id);
  const currency = paystackCurrency().toUpperCase();

  const init = await paystackInitialize({
    email: emailForOrder.includes("@") ? emailForOrder : "customer@trapwear.local",
    amount: totalCents,
    currency,
    reference,
    callbackUrl: `${origin}/checkout/success`,
    metadata: {
      order_id: result.id,
      cart_id: cartId,
    },
  });

  await db
    .update(orders)
    .set({ stripeCheckoutSessionId: init.reference })
    .where(eq(orders.id, result.id));

  return NextResponse.json({ url: init.authorizationUrl });
}
