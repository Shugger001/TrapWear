import { z } from "zod";

/** Rules for which product image strings are accepted (URLs + same-site paths). */
export type ProductImageUrlRules = {
  /** Origin of the Supabase project, e.g. `https://abcd.supabase.co` — from `NEXT_PUBLIC_SUPABASE_URL`. */
  supabaseProjectOrigin: string | null;
  /** Each entry is a full prefix; image URL must start with one of these (e.g. `https://cdn.example.com/img/`). */
  allowedUrlPrefixes: string[];
};

const MAX_IMAGE_STRING_LEN = 4096;
const MAX_IMAGES = 20;

function trimPrefixes(csv: string | undefined | null): string[] {
  if (!csv) return [];
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Build rules from typical env wiring (server or client). */
export function parseProductImageRulesFromOptions(opts: {
  nextPublicSupabaseUrl?: string | null;
  allowedImageUrlPrefixesCsv?: string | null;
}): ProductImageUrlRules {
  const raw = opts.nextPublicSupabaseUrl?.trim() ?? "";
  let supabaseProjectOrigin: string | null = null;
  if (raw) {
    try {
      supabaseProjectOrigin = new URL(raw).origin;
    } catch {
      supabaseProjectOrigin = null;
    }
  }
  return {
    supabaseProjectOrigin,
    allowedUrlPrefixes: trimPrefixes(opts.allowedImageUrlPrefixesCsv ?? undefined),
  };
}

export function normalizeProductImageEntry(input: string): string {
  return input.trim();
}

/** Safe same-origin path for static assets (e.g. `/images/foo.jpg`). Rejects protocol-relative and path traversal. */
export function isAllowedRelativeProductImagePath(s: string): boolean {
  if (s.length === 0 || s.length > MAX_IMAGE_STRING_LEN) return false;
  if (!s.startsWith("/")) return false;
  if (s.startsWith("//")) return false;
  if (s.includes("://")) return false;
  if (s.includes("\\")) return false;
  if (s.includes("\0")) return false;
  const parts = s.split("/");
  for (const part of parts) {
    if (part === "") continue;
    let decoded = part;
    try {
      decoded = decodeURIComponent(part);
    } catch {
      return false;
    }
    if (decoded === "." || decoded === "..") return false;
  }
  return true;
}

function isAllowedHttpsSupabasePublicObject(url: URL, rules: ProductImageUrlRules): boolean {
  if (url.protocol !== "https:") return false;
  if (!rules.supabaseProjectOrigin) return false;
  if (url.origin !== rules.supabaseProjectOrigin) return false;
  return url.pathname.startsWith("/storage/v1/object/public/");
}

function matchesAllowedPrefix(s: string, rules: ProductImageUrlRules): boolean {
  for (const p of rules.allowedUrlPrefixes) {
    if (p.length === 0) continue;
    if (s.startsWith(p)) return true;
  }
  return false;
}

export function isAllowedProductImageUrl(s: string, rules: ProductImageUrlRules): boolean {
  const t = normalizeProductImageEntry(s);
  if (!t) return false;
  const lower = t.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) return false;

  if (t.startsWith("/")) {
    return isAllowedRelativeProductImagePath(t);
  }

  let url: URL;
  try {
    url = new URL(t);
  } catch {
    return false;
  }

  if (url.protocol !== "https:") return false;
  if (isAllowedHttpsSupabasePublicObject(url, rules)) return true;
  if (matchesAllowedPrefix(t, rules)) return true;
  return false;
}

export function validateProductImages(
  urls: string[],
  rules: ProductImageUrlRules,
): { ok: true; images: string[] } | { ok: false; error: string } {
  const normalized = urls.map(normalizeProductImageEntry).filter(Boolean);
  if (normalized.length > MAX_IMAGES) {
    return { ok: false, error: `At most ${MAX_IMAGES} images allowed.` };
  }
  for (let i = 0; i < normalized.length; i++) {
    const entry = normalized[i]!;
    if (entry.length > MAX_IMAGE_STRING_LEN) {
      return { ok: false, error: `Image ${i + 1} exceeds maximum length.` };
    }
    if (!isAllowedProductImageUrl(entry, rules)) {
      return {
        ok: false,
        error: `Image ${i + 1} is not allowed. Use a path starting with / (e.g. /images/…), a Supabase Storage public URL for this project, or a URL matching ALLOWED_IMAGE_URL_PREFIXES.`,
      };
    }
  }
  return { ok: true, images: normalized };
}

export function zodProductImagesArray(rules: ProductImageUrlRules, max: number = MAX_IMAGES) {
  return z
    .array(z.string().min(1).max(MAX_IMAGE_STRING_LEN))
    .max(max)
    .optional()
    .superRefine((arr, ctx) => {
      if (!arr?.length) return;
      const v = validateProductImages(arr, rules);
      if (!v.ok) {
        ctx.addIssue({ code: "custom", message: v.error });
      }
    });
}
