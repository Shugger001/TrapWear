import { eq, inArray } from "drizzle-orm";
import { auditLogs, orderLines, productVariants, products } from "@trapwear/db";
import { zodProductImagesArray } from "@trapwear/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { getProductImageUrlRulesFromEnv } from "@/lib/product-image-rules";

const imageRules = getProductImageUrlRulesFromEnv();
const productImagesSchema = zodProductImagesArray(imageRules);

const createSchema = z.object({
  slug: z.string().min(2).max(120),
  name: z.string().min(2).max(160),
  description: z.string().min(5).max(2000),
  type: z.enum(["jersey", "footwear"]),
  basePriceCents: z.number().int().min(0),
  images: productImagesSchema,
});

const updateSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(2).max(120),
  name: z.string().min(2).max(160),
  description: z.string().min(5).max(2000),
  type: z.enum(["jersey", "footwear"]),
  basePriceCents: z.number().int().min(0),
  images: productImagesSchema,
});

export async function POST(req: Request) {
  const auth = await requireAdminSession("admin");
  if ("error" in auth) return auth.error;

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid product fields";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const payload = parsed.data;
  const slug = payload.slug.trim().toLowerCase();

  const [dup] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  if (dup) {
    return NextResponse.json({ error: "Slug already exists." }, { status: 409 });
  }

  const [created] = await db
    .insert(products)
    .values({
      slug,
      name: payload.name.trim(),
      description: payload.description.trim(),
      type: payload.type,
      basePriceCents: payload.basePriceCents,
      images: payload.images ?? [],
    })
    .returning();

  if (!created) {
    return NextResponse.json({ error: "Could not create product" }, { status: 500 });
  }

  await db.insert(auditLogs).values({
    actorUserId: auth.session.userId,
    action: "product.create",
    entity: "product",
    entityId: created.id,
    meta: { slug: created.slug, type: created.type },
  });

  return NextResponse.json({ ok: true, product: created });
}

export async function PATCH(req: Request) {
  const auth = await requireAdminSession("admin");
  if ("error" in auth) return auth.error;

  const json = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid payload";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const payload = parsed.data;
  const slug = payload.slug.trim().toLowerCase();

  const [existing] = await db.select().from(products).where(eq(products.id, payload.id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  if (existing.slug !== slug) {
    const [dup] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
    if (dup) {
      return NextResponse.json({ error: "Slug already exists." }, { status: 409 });
    }
  }

  await db
    .update(products)
    .set({
      slug,
      name: payload.name.trim(),
      description: payload.description.trim(),
      type: payload.type,
      basePriceCents: payload.basePriceCents,
      images: payload.images ?? [],
    })
    .where(eq(products.id, payload.id));

  await db.insert(auditLogs).values({
    actorUserId: auth.session.userId,
    action: "product.update",
    entity: "product",
    entityId: payload.id,
    meta: { slug, type: payload.type },
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

  const [existing] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const variants = await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(eq(productVariants.productId, id));
  const variantIds = variants.map((r) => r.id);
  if (variantIds.length > 0) {
    const [ol] = await db
      .select({ id: orderLines.id })
      .from(orderLines)
      .where(inArray(orderLines.variantId, variantIds))
      .limit(1);
    if (ol) {
      return NextResponse.json(
        {
          error:
            "Cannot delete this product: it appears on at least one order. Remove it from the storefront by zeroing stock or use a new listing instead of deleting.",
        },
        { status: 409 },
      );
    }
  }

  await db.delete(products).where(eq(products.id, id));

  await db.insert(auditLogs).values({
    actorUserId: auth.session.userId,
    action: "product.delete",
    entity: "product",
    entityId: id,
    meta: { slug: existing.slug, type: existing.type },
  });

  return NextResponse.json({ ok: true });
}
