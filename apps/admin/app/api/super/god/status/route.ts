import { sql } from "drizzle-orm";
import { maintenanceMode, orders, products, users } from "@trapwear/db";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-guard";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdminSession("superadmin");
  if ("error" in auth) return auth.error;

  const [userCounts, productCounts, orderCounts, maintenance] = await Promise.all([
    db
      .select({
        admins: sql<number>`count(*) filter (where role = 'admin')::int`,
        superadmins: sql<number>`count(*) filter (where role = 'superadmin')::int`,
        customers: sql<number>`count(*) filter (where role = 'customer')::int`,
      })
      .from(users),
    db
      .select({
        jerseys: sql<number>`count(*) filter (where type = 'jersey')::int`,
        footwear: sql<number>`count(*) filter (where type = 'footwear')::int`,
      })
      .from(products),
    db
      .select({
        pendingPayment: sql<number>`count(*) filter (where status = 'pending_payment')::int`,
        paid: sql<number>`count(*) filter (where status = 'paid')::int`,
        fulfilled: sql<number>`count(*) filter (where status = 'fulfilled')::int`,
        cancelled: sql<number>`count(*) filter (where status = 'cancelled')::int`,
      })
      .from(orders),
    db.select().from(maintenanceMode).limit(1),
  ]);

  return NextResponse.json({
    ok: true,
    uptimeSeconds: Math.floor(process.uptime()),
    env: {
      databaseConfigured: Boolean(process.env.DATABASE_URL),
      adminJwtConfigured: Boolean(process.env.ADMIN_JWT_SECRET && process.env.ADMIN_JWT_SECRET.length >= 32),
      paystackConfigured: Boolean(process.env.PAYSTACK_SECRET_KEY),
      resendConfigured: Boolean(process.env.RESEND_API_KEY),
    },
    maintenance: maintenance[0] ?? { enabled: false, message: null },
    users: userCounts ?? { admins: 0, superadmins: 0, customers: 0 },
    products: productCounts ?? { jerseys: 0, footwear: 0 },
    orders: orderCounts ?? { pendingPayment: 0, paid: 0, fulfilled: 0, cancelled: 0 },
  });
}
