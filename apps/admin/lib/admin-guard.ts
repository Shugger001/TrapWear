import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, type AdminRole, verifyAdminSession } from "@/lib/auth";

type Session = { userId: string; role: AdminRole };

function roleRank(role: AdminRole): number {
  return role === "superadmin" ? 2 : 1;
}

export async function requireAdminSession(minRole: AdminRole = "admin"): Promise<
  { session: Session } | { error: NextResponse }
> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  try {
    const session = await verifyAdminSession(token);
    if (roleRank(session.role) < roleRank(minRole)) {
      return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
    return { session };
  } catch {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
}
