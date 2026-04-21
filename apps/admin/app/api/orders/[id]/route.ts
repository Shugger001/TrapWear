import { eq } from "drizzle-orm";
import { auditLogs, orders } from "@trapwear/db";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";

const patchSchema = z.object({
  status: z.enum(["pending_payment", "paid", "fulfilled", "cancelled"]),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
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

  const [existing] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({ status: parsed.data.status, updatedAt: new Date() })
      .where(eq(orders.id, id));

    await tx.insert(auditLogs).values({
      actorUserId: session.userId,
      action: "order.status_update",
      entity: "order",
      entityId: id,
      meta: { from: existing.status, to: parsed.data.status },
    });
  });

  return NextResponse.json({ ok: true });
}
