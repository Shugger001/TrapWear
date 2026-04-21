import "dotenv/config";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./client";
import {
  coupons,
  customizationTemplates,
  featureFlags,
  maintenanceMode,
  productVariants,
  products,
  users,
} from "./schema";

async function main() {
  const adminPass = process.env.SEED_ADMIN_PASSWORD ?? "TrapWear!Admin99";
  const superPass = process.env.SEED_SUPER_PASSWORD ?? "TrapWear!Super99";

  const existingAdmin = await db.select().from(users).where(eq(users.email, "admin@trapwear.dev")).limit(1);
  if (existingAdmin.length === 0) {
    await db.insert(users).values({
      email: "admin@trapwear.dev",
      passwordHash: await hash(adminPass, 10),
      name: "TrapWear Admin",
      role: "admin",
    });
  }

  const existingSuper = await db.select().from(users).where(eq(users.email, "super@trapwear.dev")).limit(1);
  if (existingSuper.length === 0) {
    await db.insert(users).values({
      email: "super@trapwear.dev",
      passwordHash: await hash(superPass, 10),
      name: "TrapWear Super",
      role: "superadmin",
    });
  }

  const jerseyRows = await db
    .select()
    .from(products)
    .where(eq(products.slug, "velocity-pro-home-jersey"))
    .limit(1);
  let jersey = jerseyRows[0];
  if (!jersey) {
    const inserted = await db
      .insert(products)
      .values({
        slug: "velocity-pro-home-jersey",
        name: "Velocity Pro Home Jersey",
        description:
          "Lightweight match jersey with moisture-wicking fabric, engineered for TrapWear athletes. Customize with name, number, and official league patches.",
        type: "jersey",
        basePriceCents: 8900,
        images: ["/images/jersey-hero.svg"],
      })
      .returning();
    jersey = inserted[0]!;
  }

  const jv = await db.select().from(productVariants).where(eq(productVariants.productId, jersey.id));
  if (jv.length === 0) {
    await db.insert(productVariants).values([
      {
        productId: jersey.id,
        sku: "TW-JER-VPH-S",
        label: "S",
        priceModifierCents: 0,
        stock: 40,
        options: { size: "S" },
      },
      {
        productId: jersey.id,
        sku: "TW-JER-VPH-M",
        label: "M",
        priceModifierCents: 0,
        stock: 60,
        options: { size: "M" },
      },
      {
        productId: jersey.id,
        sku: "TW-JER-VPH-L",
        label: "L",
        priceModifierCents: 0,
        stock: 50,
        options: { size: "L" },
      },
    ]);
  }

  const tmplRows = await db
    .select()
    .from(customizationTemplates)
    .where(eq(customizationTemplates.productId, jersey.id))
    .limit(1);
  if (tmplRows.length === 0) {
    await db.insert(customizationTemplates).values({
      productId: jersey.id,
      name: "Jersey personalization",
      schema: {
        layers: [
          { id: "nameset", label: "Name & number kit", surchargeCents: 1500 },
          { id: "patch", label: "League patch", surchargeCents: 800 },
        ],
      },
    });
  }

  const bootRows = await db
    .select()
    .from(products)
    .where(eq(products.slug, "apex-street-runner"))
    .limit(1);
  let boot = bootRows[0];
  if (!boot) {
    const inserted = await db
      .insert(products)
      .values({
        slug: "apex-street-runner",
        name: "Apex Street Runner",
        description:
          "Men’s everyday sneaker with responsive cushioning, premium leather accents, and a silhouette built for city miles.",
        type: "footwear",
        basePriceCents: 12900,
        images: ["/images/sneaker-hero.svg"],
      })
      .returning();
    boot = inserted[0]!;
  }

  const fv = await db.select().from(productVariants).where(eq(productVariants.productId, boot.id));
  if (fv.length === 0) {
    await db.insert(productVariants).values([
      {
        productId: boot.id,
        sku: "TW-FTW-ASR-9",
        label: "US 9",
        priceModifierCents: 0,
        stock: 25,
        options: { size: "9" },
      },
      {
        productId: boot.id,
        sku: "TW-FTW-ASR-10",
        label: "US 10",
        priceModifierCents: 0,
        stock: 30,
        options: { size: "10" },
      },
      {
        productId: boot.id,
        sku: "TW-FTW-ASR-11",
        label: "US 11",
        priceModifierCents: 200,
        stock: 20,
        options: { size: "11" },
      },
    ]);
  }

  const flagRows = await db
    .select()
    .from(featureFlags)
    .where(eq(featureFlags.key, "storefront_hero_banner"))
    .limit(1);
  if (flagRows.length === 0) {
    await db.insert(featureFlags).values({
      key: "storefront_hero_banner",
      value: true,
      description: "Shows promotional hero ribbon on the storefront home page.",
    });
  }

  const mmRows = await db.select().from(maintenanceMode).limit(1);
  if (mmRows.length === 0) {
    await db.insert(maintenanceMode).values({ enabled: false, message: null });
  }

  const couponRows = await db.select().from(coupons).where(eq(coupons.code, "WELCOME10")).limit(1);
  if (couponRows.length === 0) {
    await db.insert(coupons).values({
      code: "WELCOME10",
      percentOff: 10,
      active: true,
      minSubtotalCents: 5000,
      expiresAt: null,
    });
  }

  console.log("Seed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
