import { eq } from "drizzle-orm";
import { auditLogs, maintenanceMode, users } from "@trapwear/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin-guard";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("maintenance.set"),
    enabled: z.boolean(),
    message: z.string().max(500).nullable().optional(),
  }),
  z.object({
    action: z.literal("user.role.set"),
    userId: z.string().uuid(),
    role: z.enum(["admin", "superadmin"]),
  }),
]);

export async function POST(req: Request) {
  const auth = await requireAdminSession("superadmin");
  if ("error" in auth) return auth.error;

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (parsed.data.action === "maintenance.set") {
    const payload = parsed.data;
    const [row] = await db.select().from(maintenanceMode).limit(1);

    await db.transaction(async (tx) => {
      if (row) {
        await tx
          .update(maintenanceMode)
          .set({
            enabled: payload.enabled,
            message: payload.message ?? null,
            updatedAt: new Date(),
          })
          .where(eq(maintenanceMode.id, row.id));
      } else {
        await tx.insert(maintenanceMode).values({
          enabled: payload.enabled,
          message: payload.message ?? null,
        });
      }

      await tx.insert(auditLogs).values({
        actorUserId: auth.session.userId,
        action: "god.maintenance.set",
        entity: "maintenance_mode",
        entityId: row?.id ?? null,
        meta: { enabled: payload.enabled, message: payload.message ?? null },
      });
    });

    return NextResponse.json({ ok: true });
  }

  const payload = parsed.data;
  const [target] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await db.transaction(async (tx) => {
    await tx.update(users).set({ role: payload.role }).where(eq(users.id, payload.userId));

    await tx.insert(auditLogs).values({
      actorUserId: auth.session.userId,
      action: "god.user.role.set",
      entity: "user",
      entityId: payload.userId,
      meta: { email: target.email, fromRole: target.role, toRole: payload.role },
    });
  });

  return NextResponse.json({ ok: true });
}
