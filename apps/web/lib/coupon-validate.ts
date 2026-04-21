import { sql } from "drizzle-orm";
import { coupons } from "@trapwear/db";
import { percentDiscountCents } from "@trapwear/core";
import { db } from "@/lib/db";
import { orderTotalsFromSubtotal } from "@/lib/order-totals";
import type { CartLineView } from "@/lib/cart";

export type ValidatedCoupon = {
  id: string;
  code: string;
  percentOff: number;
  discountCents: number;
  totals: ReturnType<typeof orderTotalsFromSubtotal> & {
    subtotalBeforeDiscountCents: number;
  };
};

export async function validateCouponForCart(
  rawCode: string,
  lines: CartLineView[],
): Promise<{ ok: true; coupon: ValidatedCoupon } | { ok: false; error: string }> {
  const code = rawCode.trim().toUpperCase();
  if (!code) {
    return { ok: false, error: "Enter a promo code." };
  }

  const subtotalBeforeDiscountCents = lines.reduce((s, l) => s + l.lineTotalCents, 0);
  if (subtotalBeforeDiscountCents <= 0) {
    return { ok: false, error: "Cart is empty." };
  }

  const [row] = await db
    .select()
    .from(coupons)
    .where(sql`upper(${coupons.code}) = ${code}`)
    .limit(1);

  if (!row) {
    return { ok: false, error: "Invalid or expired code." };
  }

  if (!row.active) {
    return { ok: false, error: "This promo code is not active." };
  }

  const now = new Date();
  if (row.expiresAt && row.expiresAt < now) {
    return { ok: false, error: "This promo code has expired." };
  }

  if (row.minSubtotalCents > subtotalBeforeDiscountCents) {
    return { ok: false, error: "Cart subtotal is below the minimum for this code." };
  }

  if (row.maxRedemptions != null && row.redemptionCount >= row.maxRedemptions) {
    return { ok: false, error: "This promo code has reached its redemption limit." };
  }

  const discountCents = percentDiscountCents(subtotalBeforeDiscountCents, row.percentOff);
  const totals = orderTotalsFromSubtotal(subtotalBeforeDiscountCents, discountCents);

  return {
    ok: true,
    coupon: {
      id: row.id,
      code: row.code,
      percentOff: row.percentOff,
      discountCents,
      totals: {
        subtotalBeforeDiscountCents,
        ...totals,
      },
    },
  };
}
