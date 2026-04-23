import { and, count, eq, ne } from "drizzle-orm";
import { auditLogs, orderLines, productVariants, products } from "@trapwear/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin-guard";
import { db } from "@/lib/db";

const createSchema = z.object({
  productId: z.string().uuid(),
  sku: z.string().min(2).max(80),
  label: z.string().min(1).max(120),
  priceModifierCents: z.number().int().optional().default(0),
  stock: z.number().int().min(0).optional().default(0),
  options: z.record(z.string(), z.string()).optional().default({}),
});

const patchSchema = z.object({
  id: z.string().uuid(),
  sku: z.string().min(2).max(80).optional(),
  label: z.string().min(1).max(120).optional(),
  priceModifierCents: z.number().int().optional(),
  stock: z.number().int().min(0).optional(),
  options: z.record(z.string(), z.string()).optional(),
});

export async function POST(req: Request) {
  const auth = await requireAdminSession("admin");
  if ("error" in auth) return auth.error;

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid variant fields" }, { status: 400 });
  }

  const { productId, sku, label, priceModifierCents, stock, options } = parsed.data;
  const skuNorm = sku.trim();

  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const [dupSku] = await db.select().from(productVariants).where(eq(productVariants.sku, skuNorm)).limit(1);
  if (dupSku) {
    return NextResponse.json({ error: "SKU already exists." }, { status: 409 });
  }

  const [created] = await db
    .insert(productVariants)
    .values({
      productId,
      sku: skuNorm,
      label: label.trim(),
      priceModifierCents,
      stock,
      options: options ?? {},
    })
    .returning();

  if (!created) {
    return NextResponse.json({ error: "Could not create variant" }, { status: 500 });
  }

  await db.insert(auditLogs).values({
    actorUserId: auth.session.userId,
    action: "product_variant.create",
    entity: "product_variant",
    entityId: created.id,
    meta: { sku: created.sku, productId, label: created.label },
  });

  return NextResponse.json({ ok: true, variant: created });
}

export async function PATCH(req: Request) {
  const auth = await requireAdminSession("admin");
  if ("error" in auth) return auth.error;

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { id, sku, label, priceModifierCents, stock, options } = parsed.data;

  const [existing] = await db.select().from(productVariants).where(eq(productVariants.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Variant not found" }, { status: 404 });
  }

  const nextSku = sku !== undefined ? sku.trim() : existing.sku;
  if (nextSku !== existing.sku) {
    const [dup] = await db
      .select()
      .from(productVariants)
      .where(and(eq(productVariants.sku, nextSku), ne(productVariants.id, id)))
      .limit(1);
    if (dup) {
      return NextResponse.json({ error: "SKU already exists." }, { status: 409 });
    }
  }

  await db
    .update(productVariants)
    .set({
      sku: nextSku,
      label: label !== undefined ? label.trim() : existing.label,
      priceModifierCents: priceModifierCents ?? existing.priceModifierCents,
      stock: stock ?? existing.stock,
      options: options !== undefined ? options : existing.options,
    })
    .where(eq(productVariants.id, id));

  await db.insert(auditLogs).values({
    actorUserId: auth.session.userId,
    action: "product_variant.update",
    entity: "product_variant",
    entityId: id,
    meta: { sku: nextSku },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const auth = await requireAdminSession("admin");
  if ("error" in auth) return auth.error;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const [existing] = await db.select().from(productVariants).where(eq(productVariants.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Variant not found" }, { status: 404 });
  }

  const [usage] = await db
    .select({ n: count() })
    .from(orderLines)
    .where(eq(orderLines.variantId, id));
  const used = Number(usage?.n ?? 0);
  if (used > 0) {
    return NextResponse.json(
      { error: "Cannot delete variant: it appears on existing orders." },
      { status: 409 },
    );
  }

  await db.delete(productVariants).where(eq(productVariants.id, id));

  await db.insert(auditLogs).values({
    actorUserId: auth.session.userId,
    action: "product_variant.delete",
    entity: "product_variant",
    entityId: id,
    meta: { sku: existing.sku, productId: existing.productId },
  });

  return NextResponse.json({ ok: true });
}
