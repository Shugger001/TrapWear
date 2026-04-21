import { NextResponse } from "next/server";
import { z } from "zod";
import { loadCartLines } from "@/lib/cart";
import { getCartIdFromCookie } from "@/lib/cart-cookie";
import { validateCouponForCart } from "@/lib/coupon-validate";

const bodySchema = z.object({
  code: z.string().min(1),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const cartId = await getCartIdFromCookie();
  if (!cartId) {
    return NextResponse.json({ error: "No cart" }, { status: 400 });
  }

  const lines = await loadCartLines(cartId);
  const result = await validateCouponForCart(parsed.data.code, lines);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ coupon: result.coupon });
}
