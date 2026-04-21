import { and, eq } from "drizzle-orm";
import { cartLines } from "@trapwear/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { CART_COOKIE, getCartIdFromCookie } from "@/lib/cart-cookie";
import { db } from "@/lib/db";
import { getOrCreateCartId, cartCookieOptions } from "@/lib/cart";
import { cookies } from "next/headers";

const addBody = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20),
  customization: z.record(z.unknown()).optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = addBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const cartId = await getOrCreateCartId(await getCartIdFromCookie());
  cookieStore.set(CART_COOKIE, cartId, cartCookieOptions());

  await db.insert(cartLines).values({
    cartId,
    variantId: parsed.data.variantId,
    quantity: parsed.data.quantity,
    customization: parsed.data.customization ?? {},
  });

  return NextResponse.json({ ok: true, cartId });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const lineId = url.searchParams.get("lineId");
  if (!lineId) {
    return NextResponse.json({ error: "lineId required" }, { status: 400 });
  }

  const cartId = await getCartIdFromCookie();
  if (!cartId) {
    return NextResponse.json({ error: "No cart" }, { status: 400 });
  }

  const removed = await db
    .delete(cartLines)
    .where(and(eq(cartLines.id, lineId), eq(cartLines.cartId, cartId)))
    .returning({ id: cartLines.id });

  if (removed.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
