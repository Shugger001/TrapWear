import { asc, ilike, or } from "drizzle-orm";
import { users } from "@trapwear/db";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-guard";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireAdminSession("superadmin");
  if ("error" in auth) return auth.error;

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (!q) {
    return NextResponse.json({ users: [] });
  }

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    })
    .from(users)
    .where(or(ilike(users.email, `%${q}%`), ilike(users.name, `%${q}%`)))
    .orderBy(asc(users.email))
    .limit(20);

  return NextResponse.json({ users: rows });
}
