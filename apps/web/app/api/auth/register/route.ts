import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { users } from "@trapwear/db";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { signCustomerSession, CUSTOMER_COOKIE, customerCookieOptions } from "@/lib/customer-auth";
import { db } from "@/lib/db";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(120).optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid registration" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const passwordHash = await hash(parsed.data.password, 10);

  const [user] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      name: parsed.data.name?.trim() || null,
      role: "customer",
    })
    .returning({ id: users.id });

  if (!user) {
    return NextResponse.json({ error: "Could not create account" }, { status: 500 });
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
