import { sweepStaleCheckoutOrders } from "@trapwear/ops";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST() {
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

  const minutes = Number(process.env.STALE_CHECKOUT_MINUTES ?? 60);

  const result = await sweepStaleCheckoutOrders(db, {
    staleMinutes: minutes,
    auditActorUserId: session.userId,
    auditSource: "admin",
  });

  return NextResponse.json({
    ok: true,
    cancelled: result.cancelled,
    staleCheckoutMinutes: result.staleCheckoutMinutes,
    remoteSessionsExpired: result.remoteSessionsExpired,
    orderIds: result.orderIds,
  });
}
