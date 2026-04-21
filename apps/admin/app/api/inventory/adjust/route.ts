import { eq } from "drizzle-orm";
import { auditLogs, productVariants } from "@trapwear/db";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";

const bodySchema = z.object({
  variantId: z.string().uuid(),
  /** Positive adds stock, negative removes (cannot go below zero). */
  delta: z.number().int().min(-999999).max(999999),
  reason: z.string().min(1).max(500),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let session: { userId: string; role: string };
  try {
    session = await verifyAdminSession(token);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role !== "admin" && session.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { variantId, delta, reason } = parsed.data;

  try {
    const result = await db.transaction(async (tx) => {
      const [v] = await tx
        .select()
        .from(productVariants)
        .where(eq(productVariants.id, variantId))
        .for("update")
        .limit(1);

      if (!v) {
        throw new Error("NOT_FOUND");
      }

      const next = v.stock + delta;
      if (next < 0) {
        throw new Error("NEGATIVE_STOCK");
      }

      await tx
        .update(productVariants)
        .set({ stock: next })
        .where(eq(productVariants.id, variantId));

      await tx.insert(auditLogs).values({
        actorUserId: session.userId,
        action: "inventory.adjust",
        entity: "product_variant",
        entityId: variantId,
        meta: {
          sku: v.sku,
          delta,
          previousStock: v.stock,
          newStock: next,
          reason,
        },
      });

      return { sku: v.sku, newStock: next };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }
    if (msg === "NEGATIVE_STOCK") {
      return NextResponse.json({ error: "Stock cannot be negative" }, { status: 400 });
    }
    throw e;
  }
}
