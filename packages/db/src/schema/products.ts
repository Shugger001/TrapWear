import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: text("type", { enum: ["jersey", "footwear"] }).notNull(),
  basePriceCents: integer("base_price_cents").notNull(),
  images: jsonb("images").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productVariants = pgTable("product_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  sku: text("sku").notNull().unique(),
  label: text("label").notNull(),
  priceModifierCents: integer("price_modifier_cents").notNull().default(0),
  stock: integer("stock").notNull().default(0),
  options: jsonb("options").$type<Record<string, string>>().notNull().default({}),
});

export const customizationTemplates = pgTable("customization_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  schema: jsonb("schema").notNull().$type<{
    layers: { id: string; label: string; surchargeCents: number }[];
  }>(),
});
