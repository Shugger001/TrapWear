import { cookies } from "next/headers";
import { AdminShell } from "@/components/admin-shell";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/auth";

export default async function MainShellLayout({ children }: { children: React.ReactNode }) {
  let isSuperadmin = false;
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (token) {
    try {
      const s = await verifyAdminSession(token);
      isSuperadmin = s.role === "superadmin";
    } catch {
      /* ignore */
    }
  }

  return <AdminShell isSuperadmin={isSuperadmin}>{children}</AdminShell>;
}
