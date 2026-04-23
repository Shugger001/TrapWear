import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { users } from "@trapwear/db";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { signCustomerSession, CUSTOMER_COOKIE, customerCookieOptions } from "@/lib/customer-auth";
import { db } from "@/lib/db";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user?.passwordHash) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const ok = await compare(parsed.data.password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  let token: string;
  try {
    token = await signCustomerSession(user.id);
  } catch {
    return NextResponse.json({ error: "Server misconfigured (customer auth)" }, { status: 500 });
  }

  const cookieStore = await cookies();
  cookieStore.set(CUSTOMER_COOKIE, token, customerCookieOptions());

  return NextResponse.json({ ok: true, userId: user.id });
}
