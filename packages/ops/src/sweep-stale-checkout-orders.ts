import { and, eq, lt } from "drizzle-orm";
import type { Db } from "@trapwear/db";
import { auditLogs, orders } from "@trapwear/db";

export type SweepStaleCheckoutOrdersResult = {
  cancelled: number;
  /** Always 0 — Paystack has no server-side “expire checkout session” API. */
  remoteSessionsExpired: number;
  orderIds: string[];
  staleCheckoutMinutes: number;
};

/**
 * Marks stale `pending_payment` orders as cancelled (frees coupon capacity).
 */
export async function sweepStaleCheckoutOrders(
  db: Db,
  opts: {
    staleMinutes: number;
    /** When set (e.g. super-admin manual run), stored on the audit log row. */
    auditActorUserId?: string | null;
    auditSource: "cron" | "admin";
  },
): Promise<SweepStaleCheckoutOrdersResult> {
  const minutes = Math.max(5, opts.staleMinutes);
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);

  const cancelled = await db
    .update(orders)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(and(eq(orders.status, "pending_payment"), lt(orders.createdAt, cutoff)))
    .returning({
      id: orders.id,
    });

  if (cancelled.length > 0) {
    await db.insert(auditLogs).values({
      actorUserId: opts.auditActorUserId ?? null,
      action: "order.sweep_stale_cancelled",
      entity: "order",
      entityId: "batch",
      meta: {
        count: cancelled.length,
        orderIds: cancelled.map((c) => c.id),
        staleCheckoutMinutes: minutes,
        remoteSessionsExpired: 0,
        source: opts.auditSource,
      },
    });
  }

  return {
    cancelled: cancelled.length,
    remoteSessionsExpired: 0,
    orderIds: cancelled.map((c) => c.id),
    staleCheckoutMinutes: minutes,
  };
}
