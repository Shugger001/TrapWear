import Link from "next/link";
import { eq } from "drizzle-orm";
import { featureFlags } from "@trapwear/db";
import { FlagToggleForm } from "@/components/flag-toggle-form";
import { db } from "@/lib/db";

export default async function SuperFlagsPage() {
  const rows = await db.select().from(featureFlags).where(eq(featureFlags.key, "storefront_hero_banner")).limit(1);
  const row = rows[0];

  return (
    <div className="space-y-6 px-4 py-6 text-slate-100 sm:px-6 sm:py-8">
      <header className="space-y-3">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium">
          <Link href="/dashboard" className="text-indigo-300 hover:text-indigo-200 hover:underline">
            ← Overview
          </Link>
          <Link href="/super/coupons" className="text-indigo-300 hover:text-indigo-200 hover:underline">
            Coupons
          </Link>
          <Link href="/super/operations" className="text-indigo-300 hover:text-indigo-200 hover:underline">
            Operations
          </Link>
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Super admin · Feature flags</h1>
          <p className="text-sm text-slate-400">Toggle platform behavior. Changes are audited under the actor’s admin user.</p>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-800/90 bg-slate-900/70 p-4 shadow-xl shadow-black/25 sm:p-6">
        <h2 className="text-sm font-semibold text-white">storefront_hero_banner</h2>
        <p className="mt-2 text-sm text-slate-400">
          {row?.description ?? "Controls the promotional ribbon on the public home page."}
        </p>
        <div className="mt-4">
          <FlagToggleForm enabled={Boolean(row?.value)} variant="dark" />
        </div>
      </section>
    </div>
  );
}
