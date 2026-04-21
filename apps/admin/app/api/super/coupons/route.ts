import { eq } from "drizzle-orm";
import { auditLogs, coupons } from "@trapwear/db";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";

async function requireSuperadmin(): Promise<
  { session: { userId: string; role: string } } | { error: NextResponse }
> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  try {
    const session = await verifyAdminSession(token);
    if (session.role !== "superadmin") {
      return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
    return { session };
  } catch {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
}

const createSchema = z.object({
  code: z.string().min(1).max(64),
  percentOff: z.number().int().min(1).max(100),
  minSubtotalCents: z.number().int().min(0),
  expiresAt: z.union([z.string().datetime(), z.null()]).optional(),
  /** Omit or null = unlimited paid redemptions. */
  maxRedemptions: z.number().int().min(1).nullable().optional(),
});

export async function POST(req: Request) {
  const auth = await requireSuperadmin();
  if ("error" in auth) return auth.error;

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid coupon fields" }, { status: 400 });
  }

  const code = parsed.data.code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]+$/.test(code)) {
    return NextResponse.json(
      { error: "Code may only contain letters, digits, hyphen, and underscore." },
      { status: 400 },
    );
  }

  const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;

  const dup = await db.select().from(coupons).where(eq(coupons.code, code)).limit(1);
  if (dup[0]) {
    return NextResponse.json({ error: "A coupon with this code already exists." }, { status: 409 });
  }

  const [row] = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(coupons)
      .values({
        code,
        percentOff: parsed.data.percentOff,
        minSubtotalCents: parsed.data.minSubtotalCents,
        active: true,
        expiresAt,
        maxRedemptions: parsed.data.maxRedemptions ?? null,
        redemptionCount: 0,
      })
      .returning();

    await tx.insert(auditLogs).values({
      actorUserId: auth.session.userId,
      action: "coupon.create",
      entity: "coupon",
      entityId: inserted[0]!.id,
      meta: { code, percentOff: parsed.data.percentOff, maxRedemptions: parsed.data.maxRedemptions ?? null },
    });

    return inserted;
  });

  return NextResponse.json({ ok: true, coupon: row });
}

const patchSchema = z.object({
  id: z.string().uuid(),
  active: z.boolean(),
});

export async function PATCH(req: Request) {
  const auth = await requireSuperadmin();
  if ("error" in auth) return auth.error;

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const [existing] = await db.select().from(coupons).where(eq(coupons.id, parsed.data.id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(coupons)
      .set({ active: parsed.data.active })
      .where(eq(coupons.id, parsed.data.id));

    await tx.insert(auditLogs).values({
      actorUserId: auth.session.userId,
      action: "coupon.active_toggle",
      entity: "coupon",
      entityId: parsed.data.id,
      meta: { code: existing.code, active: parsed.data.active },
    });
  });

  return NextResponse.json({ ok: true });
}
