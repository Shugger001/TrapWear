import { eq } from "drizzle-orm";
import { featureFlags, maintenanceMode } from "@trapwear/db";
import { db } from "@/lib/db";

export async function getStorefrontHeroBanner(): Promise<boolean> {
  const rows = await db
    .select()
    .from(featureFlags)
    .where(eq(featureFlags.key, "storefront_hero_banner"))
    .limit(1);
  const v = rows[0]?.value;
  return Boolean(v);
}

export async function getMaintenance(): Promise<{ enabled: boolean; message: string | null }> {
  const rows = await db.select().from(maintenanceMode).limit(1);
  const row = rows[0];
  return { enabled: row?.enabled ?? false, message: row?.message ?? null };
}
