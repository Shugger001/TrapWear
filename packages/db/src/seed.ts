import "dotenv/config";
import bcrypt from "bcryptjs";
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
      passwordHash: await bcrypt.hash(adminPass, 10),
      name: "TrapWear Admin",
      role: "admin",
    });
  }

  const existingSuper = await db.select().from(users).where(eq(users.email, "super@trapwear.dev")).limit(1);
  if (existingSuper.length === 0) {
    await db.insert(users).values({
      email: "super@trapwear.dev",
      passwordHash: await bcrypt.hash(superPass, 10),
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

  const extraFootwear = [
    {
      slug: "nike-air-zoom-vista",
      name: "Nike Air Zoom Pegasus 40",
      description:
        "Nike everyday runner with Zoom Air responsiveness, engineered mesh breathability, and smooth heel-to-toe transition.",
      basePriceCents: 14900,
    },
    {
      slug: "adidas-ultra-bounce-pro",
      name: "Adidas Ultraboost Light",
      description:
        "Adidas performance trainer built around energy-return cushioning and a secure knit upper for daily miles.",
      basePriceCents: 15400,
    },
    {
      slug: "puma-city-drift",
      name: "Puma RS-X City Drift",
      description:
        "Puma lifestyle runner mixing RS comfort tooling with bold street styling and lightweight cushioning.",
      basePriceCents: 12900,
    },
    {
      slug: "new-balance-574-core",
      name: "New Balance 574 Core Heritage",
      description:
        "New Balance heritage icon with premium suede overlays and ENCAP-inspired stability for all-day wear.",
      basePriceCents: 13900,
    },
    {
      slug: "asics-gel-motion",
      name: "ASICS GEL-Kayano Motion",
      description:
        "ASICS stability-focused trainer featuring GEL comfort and structured support for long-distance sessions.",
      basePriceCents: 14600,
    },
    {
      slug: "reebok-club-fleet",
      name: "Reebok Club C 85 Fleet",
      description:
        "Reebok court classic in soft leather with clean retro lines and everyday versatility.",
      basePriceCents: 12400,
    },
    {
      slug: "vans-old-skool-urban",
      name: "Vans Old Skool Urban Classic",
      description:
        "Vans skate staple with reinforced toecaps, signature side stripe, and durable vulcanized grip.",
      basePriceCents: 10900,
    },
    {
      slug: "converse-chuck-70-high",
      name: "Converse Chuck 70 Vintage High",
      description:
        "Converse vintage high-top crafted with premium canvas, archival detailing, and upgraded cushioning.",
      basePriceCents: 11500,
    },
    {
      slug: "jordan-street-elevate",
      name: "Jordan 1 Low Street Elevate",
      description:
        "Jordan basketball-inspired low profile combining iconic color blocking with cushioned street comfort.",
      basePriceCents: 16900,
    },
    {
      slug: "timberland-rugged-chukka",
      name: "Timberland Premium Chukka Rugged",
      description:
        "Timberland boot silhouette with rugged traction, weather-ready upper, and outdoor-ready durability.",
      basePriceCents: 17900,
    },
    {
      slug: "dr-martens-1460-urban",
      name: "Dr. Martens 1460 Smooth Leather",
      description:
        "Dr. Martens original 8-eye boot with smooth leather upper, Goodyear welt, and air-cushioned sole.",
      basePriceCents: 18900,
    },
    {
      slug: "skechers-flex-pace",
      name: "Skechers GOwalk Flex Pace",
      description:
        "Skechers comfort-first walking shoe with lightweight flex sole and plush memory foam feel.",
      basePriceCents: 9900,
    },
    {
      slug: "hoka-clifton-edge",
      name: "Hoka Clifton 9 Edge",
      description:
        "Hoka max-cushion road runner with rocker geometry built for soft landings and efficient turnover.",
      basePriceCents: 17200,
    },
    {
      slug: "on-cloudswift-metro",
      name: "On Cloudswift 3 Metro",
      description:
        "On running shoe tuned for city sessions with CloudTec cushioning and responsive speedboard feel.",
      basePriceCents: 18100,
    },
    {
      slug: "brooks-ghost-road",
      name: "Brooks Ghost 15 Road",
      description:
        "Brooks neutral daily trainer offering balanced cushioning and smooth transitions over long runs.",
      basePriceCents: 15800,
    },
    {
      slug: "saucony-ride-city",
      name: "Saucony Ride 17 City",
      description:
        "Saucony neutral trainer delivering lightweight comfort, breathable support, and consistent ride quality.",
      basePriceCents: 15200,
    },
    {
      slug: "birkenstock-arizona-soft",
      name: "Birkenstock Arizona Soft Footbed",
      description:
        "Birkenstock two-strap classic with contoured cork-latex support and soft-footbed comfort.",
      basePriceCents: 11800,
    },
    {
      slug: "crocs-classic-clog-max",
      name: "Crocs Classic Clog Max Comfort",
      description:
        "Crocs classic molded clog offering lightweight cushioning, airflow ports, and easy everyday wear.",
      basePriceCents: 7900,
    },
    {
      slug: "clarks-desert-pace",
      name: "Clarks Desert Pace Leather",
      description:
        "Clarks heritage-inspired leather shoe with refined profile and flexible comfort-focused sole.",
      basePriceCents: 14200,
    },
    {
      slug: "gucci-ace-street",
      name: "Gucci Ace Leather Street",
      description:
        "Gucci luxury leather sneaker with premium finish, elevated craftsmanship, and minimalist court styling.",
      basePriceCents: 32900,
    },
  ] as const;

  for (const item of extraFootwear) {
    const existingRows = await db.select().from(products).where(eq(products.slug, item.slug)).limit(1);
    let footwearProduct = existingRows[0];
    if (!footwearProduct) {
      const inserted = await db
        .insert(products)
        .values({
          slug: item.slug,
          name: item.name,
          description: item.description,
          type: "footwear",
          basePriceCents: item.basePriceCents,
          images: ["/images/sneaker-hero.svg"],
        })
        .returning();
      footwearProduct = inserted[0]!;
    } else {
      await db
        .update(products)
        .set({
          name: item.name,
          description: item.description,
          basePriceCents: item.basePriceCents,
        })
        .where(eq(products.id, footwearProduct.id));
    }

    const variants = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, footwearProduct.id));
    if (variants.length === 0) {
      const skuBase = item.slug.replace(/-/g, "").slice(0, 10).toUpperCase();
      await db.insert(productVariants).values([
        {
          productId: footwearProduct.id,
          sku: `TW-FTW-${skuBase}-9`,
          label: "US 9",
          priceModifierCents: 0,
          stock: 22,
          options: { size: "9" },
        },
        {
          productId: footwearProduct.id,
          sku: `TW-FTW-${skuBase}-10`,
          label: "US 10",
          priceModifierCents: 0,
          stock: 26,
          options: { size: "10" },
        },
        {
          productId: footwearProduct.id,
          sku: `TW-FTW-${skuBase}-11`,
          label: "US 11",
          priceModifierCents: 200,
          stock: 18,
          options: { size: "11" },
        },
      ]);
    }
  }

  const extraJerseys = [
    {
      slug: "nike-strike-home-jersey",
      name: "Nike Dri-FIT Strike Home Jersey",
      description:
        "Nike Dri-FIT match jersey designed for rapid sweat dispersion, mobility, and sharp on-pitch fit.",
      basePriceCents: 9800,
    },
    {
      slug: "adidas-aero-away-jersey",
      name: "Adidas Tiro 24 Away Jersey",
      description:
        "Adidas Tiro away jersey with AEROREADY-inspired moisture control and lightweight matchday comfort.",
      basePriceCents: 9700,
    },
    {
      slug: "puma-pulse-third-jersey",
      name: "Puma Teamfinal Third Jersey",
      description:
        "Puma third kit silhouette with athletic stretch and dryCELL-style performance ventilation.",
      basePriceCents: 9600,
    },
    {
      slug: "new-balance-elite-match-jersey",
      name: "New Balance Elite Matchday Jersey",
      description:
        "New Balance match jersey featuring breathable panel mapping and streamlined athletic construction.",
      basePriceCents: 10200,
    },
    {
      slug: "asics-proline-football-jersey",
      name: "ASICS Proline Match Jersey",
      description:
        "ASICS football shirt with technical knit structure for lightweight movement and game-ready airflow.",
      basePriceCents: 9400,
    },
    {
      slug: "reebok-classic-club-jersey",
      name: "Reebok Classic Club Retro Jersey",
      description:
        "Reebok retro-inspired club jersey blending classic striping cues with modern stretch performance.",
      basePriceCents: 9100,
    },
    {
      slug: "under-armour-velocity-kit",
      name: "Under Armour Velocity Match Kit",
      description:
        "Under Armour football top engineered for sweat management and high-intensity training comfort.",
      basePriceCents: 9900,
    },
    {
      slug: "jordan-fc-street-jersey",
      name: "Jordan PSG Street Jersey",
      description:
        "Jordan x football-inspired jersey merging court heritage style with pitch-driven performance fabric.",
      basePriceCents: 10900,
    },
    {
      slug: "vans-arena-culture-jersey",
      name: "Vans Arena Culture Vintage Jersey",
      description:
        "Vans vintage football aesthetic with relaxed proportions and durable everyday jersey knit.",
      basePriceCents: 8900,
    },
    {
      slug: "converse-heritage-crest-jersey",
      name: "Converse Heritage Crest Vintage Jersey",
      description:
        "Converse heritage-themed jersey with retro crest styling and soft lightweight match fabric.",
      basePriceCents: 8800,
    },
    {
      slug: "fila-retro-sport-jersey",
      name: "Fila 90s Retro Sport Jersey",
      description:
        "Fila 90s-inspired football top combining throwback aesthetics with modern breathable construction.",
      basePriceCents: 9000,
    },
    {
      slug: "brooks-endurance-training-jersey",
      name: "Brooks Endurance Match Jersey",
      description:
        "Brooks performance jersey designed for high-output sessions, warmups, and controlled airflow.",
      basePriceCents: 9200,
    },
    {
      slug: "saucony-club-motion-jersey",
      name: "Saucony Club Motion Jersey",
      description:
        "Saucony technical football jersey built for sprint drills, agility sessions, and quick recovery.",
      basePriceCents: 9100,
    },
    {
      slug: "hoka-breathe-pro-jersey",
      name: "Hoka Breathe Pro Performance Jersey",
      description:
        "Hoka ultra-light football jersey with mapped ventilation zones for sustained match intensity.",
      basePriceCents: 10100,
    },
    {
      slug: "on-performance-match-jersey",
      name: "On Performance Matchday Jersey",
      description:
        "On performance jersey with precision seam placement and breathable structure for fast play.",
      basePriceCents: 10300,
    },
    {
      slug: "gucci-luxe-fc-jersey",
      name: "Gucci Luxe FC Heritage Jersey",
      description:
        "Gucci luxury football-inspired jersey featuring elevated detailing, premium materials, and heritage cues.",
      basePriceCents: 23900,
    },
    {
      slug: "balenciaga-oversized-kit-jersey",
      name: "Balenciaga Oversized Club Jersey",
      description:
        "Balenciaga oversized statement jersey blending runway proportions with vintage football references.",
      basePriceCents: 24900,
    },
    {
      slug: "prada-tech-core-jersey",
      name: "Prada Tech Core Match Jersey",
      description:
        "Prada minimalist technical jersey with premium handfeel and sleek modern club identity.",
      basePriceCents: 24400,
    },
    {
      slug: "clarks-community-fc-jersey",
      name: "Clarks Community FC Classic Jersey",
      description:
        "Clarks community-club inspired jersey built for reliable comfort in weekly football sessions.",
      basePriceCents: 8600,
    },
    {
      slug: "timberland-urban-athletic-jersey",
      name: "Timberland Urban Athletic Heritage Jersey",
      description:
        "Timberland heritage-inspired football jersey combining rugged styling with breathable match knit.",
      basePriceCents: 9300,
    },
  ] as const;

  for (const item of extraJerseys) {
    const existingRows = await db.select().from(products).where(eq(products.slug, item.slug)).limit(1);
    let jerseyProduct = existingRows[0];
    if (!jerseyProduct) {
      const inserted = await db
        .insert(products)
        .values({
          slug: item.slug,
          name: item.name,
          description: item.description,
          type: "jersey",
          basePriceCents: item.basePriceCents,
          images: ["/images/jersey-hero.svg"],
        })
        .returning();
      jerseyProduct = inserted[0]!;
    } else {
      await db
        .update(products)
        .set({
          name: item.name,
          description: item.description,
          basePriceCents: item.basePriceCents,
        })
        .where(eq(products.id, jerseyProduct.id));
    }

    const variants = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, jerseyProduct.id));
    if (variants.length === 0) {
      const skuBase = item.slug.replace(/-/g, "").slice(0, 10).toUpperCase();
      await db.insert(productVariants).values([
        {
          productId: jerseyProduct.id,
          sku: `TW-JER-${skuBase}-S`,
          label: "S",
          priceModifierCents: 0,
          stock: 35,
          options: { size: "S" },
        },
        {
          productId: jerseyProduct.id,
          sku: `TW-JER-${skuBase}-M`,
          label: "M",
          priceModifierCents: 0,
          stock: 45,
          options: { size: "M" },
        },
        {
          productId: jerseyProduct.id,
          sku: `TW-JER-${skuBase}-L`,
          label: "L",
          priceModifierCents: 200,
          stock: 38,
          options: { size: "L" },
        },
      ]);
    }
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
