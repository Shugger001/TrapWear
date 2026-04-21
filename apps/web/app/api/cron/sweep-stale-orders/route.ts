import { NextResponse } from "next/server";
import { sweepStaleCheckoutOrders } from "@trapwear/ops";
import { db } from "@/lib/db";

export const runtime = "nodejs";

function authorize(req: Request, secret: string): boolean {
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) {
    return true;
  }
  const url = new URL(req.url);
  return url.searchParams.get("secret") === secret;
}

/**
 * Cancels `pending_payment` orders older than STALE_CHECKOUT_MINUTES (default 60).
 * Frees coupon capacity tied up by abandoned Paystack checkouts.
 */
export async function GET(req: Request) {
  return runSweep(req);
}

export async function POST(req: Request) {
  return runSweep(req);
}

async function runSweep(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }

  if (!authorize(req, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const minutes = Number(process.env.STALE_CHECKOUT_MINUTES ?? 60);

  const result = await sweepStaleCheckoutOrders(db, {
    staleMinutes: minutes,
    auditSource: "cron",
  });

  return NextResponse.json({
    ok: true,
    cancelled: result.cancelled,
    staleCheckoutMinutes: result.staleCheckoutMinutes,
    remoteSessionsExpired: result.remoteSessionsExpired,
  });
}
