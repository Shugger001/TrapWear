import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { CUSTOMER_COOKIE } from "@/lib/customer-auth";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set(CUSTOMER_COOKIE, "", { ...{ path: "/" }, maxAge: 0 });
  return NextResponse.json({ ok: true });
}
