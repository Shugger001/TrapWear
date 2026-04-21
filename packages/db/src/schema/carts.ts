import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { productVariants } from "./products";
import { users } from "./users";

export const carts = pgTable("carts", {
  id: uuid("id").primaryKey().defaultRandom(),
  anonymousToken: text("anonymous_token").unique(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cartLines = pgTable("cart_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  cartId: uuid("cart_id")
    .notNull()
    .references(() => carts.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id")
    .notNull()
    .references(() => productVariants.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
  customization: jsonb("customization").$type<Record<string, unknown>>().notNull().default({}),
});
