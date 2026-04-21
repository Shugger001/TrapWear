import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const coupons = pgTable("coupons", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  percentOff: integer("percent_off").notNull(),
  active: boolean("active").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  minSubtotalCents: integer("min_subtotal_cents").notNull().default(0),
  /** Null = unlimited redemptions (successful paid orders). */
  maxRedemptions: integer("max_redemptions"),
  redemptionCount: integer("redemption_count").notNull().default(0),
});
