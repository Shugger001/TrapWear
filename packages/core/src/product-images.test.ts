import { describe, expect, it } from "vitest";
import {
  isAllowedProductImageUrl,
  isAllowedRelativeProductImagePath,
  parseProductImageRulesFromOptions,
  validateProductImages,
} from "./product-images";

const rulesWithSupabase = parseProductImageRulesFromOptions({
  nextPublicSupabaseUrl: "https://abcdxyz.supabase.co",
  allowedImageUrlPrefixesCsv: "https://cdn.example.com/assets/,https://img.shop.test/p/",
});

const rulesNoSupabase = parseProductImageRulesFromOptions({
  nextPublicSupabaseUrl: null,
  allowedImageUrlPrefixesCsv: "https://cdn.example.com/assets/",
});

describe("isAllowedRelativeProductImagePath", () => {
  it("allows normal static paths", () => {
    expect(isAllowedRelativeProductImagePath("/images/jersey.jpg")).toBe(true);
    expect(isAllowedRelativeProductImagePath("/images/foo/bar.png")).toBe(true);
  });
  it("rejects protocol-relative", () => {
    expect(isAllowedRelativeProductImagePath("//evil.com/x")).toBe(false);
  });
  it("rejects traversal", () => {
    expect(isAllowedRelativeProductImagePath("/images/../etc/passwd")).toBe(false);
  });
  it("rejects absolute URLs", () => {
    expect(isAllowedRelativeProductImagePath("https://a.com/x")).toBe(false);
  });
});

describe("isAllowedProductImageUrl", () => {
  it("allows Supabase public object URLs for configured origin", () => {
    const u =
      "https://abcdxyz.supabase.co/storage/v1/object/public/product-images/abc.jpg";
    expect(isAllowedProductImageUrl(u, rulesWithSupabase)).toBe(true);
  });
  it("rejects Supabase URL for wrong project", () => {
    const u =
      "https://other.supabase.co/storage/v1/object/public/product-images/abc.jpg";
    expect(isAllowedProductImageUrl(u, rulesWithSupabase)).toBe(false);
  });
  it("rejects non-public storage path", () => {
    const u = "https://abcdxyz.supabase.co/storage/v1/object/sign/product-images/abc.jpg";
    expect(isAllowedProductImageUrl(u, rulesWithSupabase)).toBe(false);
  });
  it("allows configured URL prefixes", () => {
    expect(isAllowedProductImageUrl("https://cdn.example.com/assets/x.jpg", rulesWithSupabase)).toBe(true);
    expect(isAllowedProductImageUrl("https://img.shop.test/p/1.webp", rulesWithSupabase)).toBe(true);
    expect(isAllowedProductImageUrl("https://cdn.example.com/other/x.jpg", rulesWithSupabase)).toBe(false);
  });
  it("rejects arbitrary https when no prefix and no supabase match", () => {
    expect(isAllowedProductImageUrl("https://evil.com/a.jpg", rulesNoSupabase)).toBe(false);
    expect(isAllowedProductImageUrl("https://cdn.example.com/assets/a.jpg", rulesNoSupabase)).toBe(true);
  });
  it("rejects dangerous schemes", () => {
    expect(isAllowedProductImageUrl("javascript:alert(1)", rulesWithSupabase)).toBe(false);
    expect(isAllowedProductImageUrl("data:image/png;base64,xxx", rulesWithSupabase)).toBe(false);
  });
});

describe("validateProductImages", () => {
  it("returns normalized list when valid", () => {
    const r = validateProductImages([" /images/a.jpg ", "https://cdn.example.com/assets/b.png"], rulesWithSupabase);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.images).toEqual(["/images/a.jpg", "https://cdn.example.com/assets/b.png"]);
  });
  it("fails on too many images", () => {
    const many = Array.from({ length: 21 }, (_, i) => `/images/${i}.jpg`);
    const r = validateProductImages(many, rulesWithSupabase);
    expect(r.ok).toBe(false);
  });
});
