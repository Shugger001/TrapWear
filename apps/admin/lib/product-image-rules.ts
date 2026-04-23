import { parseProductImageRulesFromOptions, type ProductImageUrlRules } from "@trapwear/core";

/** Server-only: build product image URL rules from admin process env. */
export function getProductImageUrlRulesFromEnv(): ProductImageUrlRules {
  return parseProductImageRulesFromOptions({
    nextPublicSupabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    allowedImageUrlPrefixesCsv: process.env.ALLOWED_IMAGE_URL_PREFIXES,
  });
}
