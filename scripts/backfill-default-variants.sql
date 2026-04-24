-- One-time: add a "Default" variant to any product that has none (enables /products quick "Add to cart").
-- Run in Supabase SQL editor or: psql "$DATABASE_URL" -f scripts/backfill-default-variants.sql
INSERT INTO product_variants (id, product_id, sku, label, price_modifier_cents, stock, options)
SELECT
  gen_random_uuid(),
  p.id,
  ('tw-v-' || replace(p.id::text, '-', ''))::text,
  'Default',
  0,
  1,
  '{}'::jsonb
FROM products p
WHERE NOT EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id);
