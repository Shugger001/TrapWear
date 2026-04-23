import { eq } from "drizzle-orm";
import { users } from "@trapwear/db";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { CUSTOMER_COOKIE, verifyCustomerSession } from "@/lib/customer-auth";

export async function getCustomerFromSession(): Promise<{
  userId: string;
  email: string;
  name: string | null;
  role: string;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_COOKIE)?.value;
  if (!token) return null;
  try {
    const { userId } = await verifyCustomerSession(token);
    const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!u) return null;
    return { userId: u.id, email: u.email, name: u.name, role: u.role };
  } catch {
    return null;
  }
}
