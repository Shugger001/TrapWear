import { eq } from "drizzle-orm";
import { auditLogs, featureFlags } from "@trapwear/db";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";

const bodySchema = z.object({
  key: z.string().min(1),
  value: z.boolean(),
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

  if (session.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [existing] = await db
    .select()
    .from(featureFlags)
    .where(eq(featureFlags.key, parsed.data.key))
    .limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Unknown flag" }, { status: 404 });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(featureFlags)
      .set({ value: parsed.data.value, updatedAt: new Date() })
      .where(eq(featureFlags.key, parsed.data.key));

    await tx.insert(auditLogs).values({
      actorUserId: session.userId,
      action: "feature_flag.update",
      entity: "feature_flag",
      entityId: parsed.data.key,
      meta: { value: parsed.data.value },
    });
  });

  return NextResponse.json({ ok: true });
}
