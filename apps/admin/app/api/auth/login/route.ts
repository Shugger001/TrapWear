import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { users } from "@trapwear/db";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { adminCookieOptions, ADMIN_COOKIE, signAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  }

  const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  if (!user?.passwordHash) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const ok = await compare(parsed.data.password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (user.role !== "admin" && user.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let token: string;
  try {
    token = await signAdminSession(user.id, user.role as "admin" | "superadmin");
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, token, adminCookieOptions());

  return NextResponse.json({ ok: true });
}
