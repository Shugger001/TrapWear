import Link from "next/link";
import { eq } from "drizzle-orm";
import { featureFlags } from "@trapwear/db";
import { LogoutButton } from "@/components/logout-button";
import { FlagToggleForm } from "@/components/flag-toggle-form";
import { db } from "@/lib/db";

export default async function SuperFlagsPage() {
  const rows = await db.select().from(featureFlags).where(eq(featureFlags.key, "storefront_hero_banner")).limit(1);
  const row = rows[0];

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap gap-4 text-sm">
            <Link href="/dashboard" className="font-medium text-trap-sky-700 hover:text-trap-sky-600">
              ← Dashboard
            </Link>
            <Link href="/super/coupons" className="font-medium text-trap-sky-700 hover:text-trap-sky-600">
              Coupons
            </Link>
            <Link href="/super/operations" className="font-medium text-trap-sky-700 hover:text-trap-sky-600">
              Operations
            </Link>
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-trap-navy-900">Super admin · Feature flags</h1>
          <p className="text-sm text-trap-navy-900/70">
            Toggle platform behavior. Changes are audited under the actor’s admin user.
          </p>
        </div>
        <LogoutButton />
      </header>

      <section className="rounded-2xl border border-trap-sky-100 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-trap-navy-900">storefront_hero_banner</h2>
        <p className="mt-2 text-sm text-trap-navy-900/70">
          {row?.description ?? "Controls the promotional ribbon on the public home page."}
        </p>
        <div className="mt-4">
          <FlagToggleForm enabled={Boolean(row?.value)} />
        </div>
      </section>
    </div>
  );
}
