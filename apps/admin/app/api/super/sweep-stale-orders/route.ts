import { sweepStaleCheckoutOrders } from "@trapwear/ops";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-guard";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST() {
  const auth = await requireAdminSession("superadmin");
  if ("error" in auth) return auth.error;
  const { session } = auth;

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
