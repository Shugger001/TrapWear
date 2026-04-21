import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { cartLines, carts, customizationTemplates, productVariants, products } from "@trapwear/db";
import { lineUnitPriceCents } from "@trapwear/core";
import { db } from "@/lib/db";
export async function getOrCreateCartId(cookieCartId: string | undefined): Promise<string> {
  if (cookieCartId) {
    const existing = await db.select().from(carts).where(eq(carts.id, cookieCartId)).limit(1);
    if (existing[0]) return existing[0].id;
  }
  const token = randomUUID();
  const inserted = await db
    .insert(carts)
    .values({ anonymousToken: token })
    .returning({ id: carts.id });
  return inserted[0]!.id;
}

export function cartCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}

export type CartLineView = {
  lineId: string;
  variantId: string;
  quantity: number;
  customization: Record<string, unknown>;
  productName: string;
  variantLabel: string;
  unitPriceCents: number;
  lineTotalCents: number;
};

export async function loadCartLines(cartId: string): Promise<CartLineView[]> {
  const lines = await db.select().from(cartLines).where(eq(cartLines.cartId, cartId));
  const out: CartLineView[] = [];

  for (const line of lines) {
    const [row] = await db
      .select({
        product: products,
        variant: productVariants,
      })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(eq(productVariants.id, line.variantId))
      .limit(1);

    if (!row) continue;

    const tmpl = await db
      .select()
      .from(customizationTemplates)
      .where(eq(customizationTemplates.productId, row.product.id))
      .limit(1);

    const schema = tmpl[0]?.schema ?? null;
    const unit = lineUnitPriceCents({
      basePriceCents: row.product.basePriceCents,
      priceModifierCents: row.variant.priceModifierCents,
      customizationSchema: schema,
      customization: line.customization as Record<string, unknown>,
    });
    if (!unit.ok) continue;

    out.push({
      lineId: line.id,
      variantId: line.variantId,
      quantity: line.quantity,
      customization: line.customization as Record<string, unknown>,
      productName: row.product.name,
      variantLabel: row.variant.label,
      unitPriceCents: unit.unitPriceCents,
      lineTotalCents: unit.unitPriceCents * line.quantity,
    });
  }

  return out;
}

export async function cartTotals(cartId: string) {
  const lines = await loadCartLines(cartId);
  const subtotal = lines.reduce((s, l) => s + l.lineTotalCents, 0);
  const shippingCents = subtotal > 0 ? 599 : 0;
  const taxCents = Math.round(subtotal * 0.08);
  const total = subtotal + shippingCents + taxCents;
  return { lines, subtotalCents: subtotal, shippingCents, taxCents, totalCents: total };
}

export async function clearCart(cartId: string) {
  await db.delete(cartLines).where(eq(cartLines.cartId, cartId));
}
