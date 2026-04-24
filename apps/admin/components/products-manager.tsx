"use client";

import { parseProductImageRulesFromOptions, validateProductImages } from "@trapwear/core";
import Link from "next/link";
import { Fragment, useMemo, useRef, useState, useTransition } from "react";
import { centsToMajorInput, formatMoneyCents, parseMajorToCents } from "@/lib/money";

export type VariantRow = {
  id: string;
  productId: string;
  sku: string;
  label: string;
  priceModifierCents: number;
  stock: number;
  options: Record<string, string>;
};

export type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  type: "jersey" | "footwear";
  basePriceCents: number;
  images: string[];
  variantsCount: number;
  totalStock: number;
  variants: VariantRow[];
};

type OptionRow = { key: string; value: string };

type Draft = {
  id?: string;
  slug: string;
  name: string;
  description: string;
  type: "jersey" | "footwear";
  basePriceMajor: string;
  imagesText: string;
};

type VariantAddDraft = {
  sku: string;
  label: string;
  priceModifierMajor: string;
  stock: number;
  optionRows: OptionRow[];
  advancedJson: string;
};

type VariantEditDraft = {
  id: string;
  sku: string;
  label: string;
  priceModifierMajor: string;
  stock: number;
  optionRows: OptionRow[];
  advancedJson: string;
};

type DestructiveConfirm =
  | { kind: "product"; id: string; name: string }
  | { kind: "variant"; productId: string; variantId: string; sku: string };

const EMPTY_DRAFT: Draft = {
  slug: "",
  name: "",
  description: "",
  type: "jersey",
  basePriceMajor: "0.00",
  imagesText: "",
};

function emptyVariantAdd(): VariantAddDraft {
  return {
    sku: "",
    label: "",
    priceModifierMajor: "0.00",
    stock: 0,
    optionRows: [{ key: "size", value: "" }],
    advancedJson: "",
  };
}

function normalizeImages(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Lowercase path segment: letters, numbers, single hyphens between segments (matches typical URL slugs). */
const SLUG_URL_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type ProductDraftAnalysis = {
  ready: boolean;
  firstError: string | null;
  checklist: { id: string; label: string; ok: boolean }[];
  slugNormalized: string;
  /** Length matches API (2–120); does not enforce character set (API allows any string in range). */
  slugLenOk: boolean;
  /** Best-practice URL segment: letters, numbers, single hyphens — advisory only. */
  slugUrlShapeOk: boolean;
  slugInlineError: string | null;
  slugFormatWarning: string | null;
};

function analyzeProductDraft(
  draft: Draft,
  clientImageRules: ReturnType<typeof parseProductImageRulesFromOptions>,
): ProductDraftAnalysis {
  const slugNormalized = draft.slug.trim().toLowerCase();
  const nameTrim = draft.name.trim();
  const descTrim = draft.description.trim();
  const price = parseMajorToCents(draft.basePriceMajor);
  const imgs = normalizeImages(draft.imagesText);

  const slugLenOk = slugNormalized.length >= 2 && slugNormalized.length <= 120;
  const slugUrlShapeOk = slugLenOk && SLUG_URL_PATTERN.test(slugNormalized);
  const nameOk = nameTrim.length >= 2 && nameTrim.length <= 160;
  const descOk = descTrim.length >= 5 && draft.description.length <= 2000;
  const priceOk = price.ok && price.cents >= 0;
  let imagesOk = true;
  if (imgs.length > 0) {
    const iv = validateProductImages(imgs, clientImageRules);
    imagesOk = iv.ok;
  }

  let slugInlineError: string | null = null;
  if (draft.slug.trim() && !slugLenOk) {
    if (slugNormalized.length < 2) slugInlineError = "Use at least 2 characters.";
    else slugInlineError = "Use at most 120 characters.";
  }

  let slugFormatWarning: string | null = null;
  if (slugLenOk && !slugUrlShapeOk) {
    slugFormatWarning =
      "For clean URLs, use only lowercase letters, numbers, and hyphens (no spaces). The API still accepts this slug as typed.";
  }

  const checklist: { id: string; label: string; ok: boolean }[] = [
    { id: "slug", label: "Slug is 2–120 characters (API)", ok: slugLenOk },
    { id: "name", label: "Display name is 2–160 characters", ok: nameOk },
    { id: "desc", label: "Description is 5–2000 characters", ok: descOk },
    { id: "price", label: "Base price is valid and ≥ 0", ok: priceOk },
    {
      id: "images",
      label: imgs.length === 0 ? "Images (optional)" : "Listed image URLs are allowed",
      ok: imagesOk,
    },
  ];

  const ready = checklist.every((c) => c.ok);

  let firstError: string | null = null;
  if (!slugLenOk) {
    if (!draft.slug.trim()) firstError = "Slug is required.";
    else if (slugNormalized.length < 2) firstError = "Slug must be at least 2 characters.";
    else firstError = "Slug must be at most 120 characters.";
  } else if (!nameOk) {
    if (nameTrim.length < 2) firstError = "Name must be at least 2 characters.";
    else firstError = "Name must be at most 160 characters.";
  } else if (!descOk) {
    if (descTrim.length < 5) firstError = "Description must be at least 5 characters.";
    else firstError = "Description must be at most 2000 characters.";
  } else if (!priceOk) {
    firstError = price.ok ? "Base price cannot be negative." : price.error;
  } else if (!imagesOk) {
    const iv = validateProductImages(imgs, clientImageRules);
    firstError = iv.ok ? null : iv.error;
  }

  return {
    ready,
    firstError,
    checklist,
    slugNormalized,
    slugLenOk,
    slugUrlShapeOk,
    slugInlineError,
    slugFormatWarning,
  };
}

function totalsFromVariants(variants: VariantRow[]) {
  return {
    variantsCount: variants.length,
    totalStock: variants.reduce((sum, v) => sum + v.stock, 0),
  };
}

function parseOptionsJson(text: string): { ok: true; value: Record<string, string> } | { ok: false; error: string } {
  const trimmed = text.trim() || "{}";
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, error: "Options must be a JSON object." };
    }
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v !== "string") {
        return { ok: false, error: `Option "${k}" must be a string value.` };
      }
      out[k] = v;
    }
    return { ok: true, value: out };
  } catch {
    return { ok: false, error: "Invalid JSON in options." };
  }
}

function optionsFromRows(rows: OptionRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of rows) {
    const k = r.key.trim();
    if (!k) continue;
    out[k] = r.value;
  }
  return out;
}

function mergeOptionsWithAdvanced(
  base: Record<string, string>,
  advancedJson: string,
): { ok: true; value: Record<string, string> } | { ok: false; error: string } {
  const t = advancedJson.trim();
  if (!t) return { ok: true, value: base };
  const adv = parseOptionsJson(t);
  if (!adv.ok) return adv;
  return { ok: true, value: { ...base, ...adv.value } };
}

function optionRowsFromRecord(opts: Record<string, string>): OptionRow[] {
  const entries = Object.entries(opts);
  if (entries.length === 0) return [{ key: "", value: "" }];
  return entries.map(([key, value]) => ({ key, value }));
}

function reorderImageLine(text: string, index: number, delta: -1 | 1): string {
  const lines = text.split("\n").map((s) => s.trim()).filter(Boolean);
  const j = index + delta;
  if (j < 0 || j >= lines.length) return text;
  const next = [...lines];
  [next[index], next[j]] = [next[j], next[index]];
  return next.join("\n");
}

function ImagePreviewStrip(props: {
  urls: string[];
  imagesText: string;
  onReorder: (next: string) => void;
}) {
  if (props.urls.length === 0) return null;
  return (
    <div className="mt-3 space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Preview & order</p>
      <ul className="flex flex-wrap gap-2">
        {props.urls.map((url, i) => (
          <li key={`${url}-${i}`} className="relative">
            <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-slate-700 bg-slate-950">
              {/* eslint-disable-next-line @next/next/no-img-element -- admin previews; arbitrary storefront URLs */}
              <img
                src={url}
                alt=""
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.opacity = "0.15";
                }}
              />
            </div>
            <div className="mt-1 flex justify-center gap-0.5">
              <button
                type="button"
                aria-label="Move image up"
                disabled={i === 0}
                onClick={() => props.onReorder(reorderImageLine(props.imagesText, i, -1))}
                className="rounded border border-slate-600 px-1 text-[10px] text-slate-300 hover:bg-slate-800 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                aria-label="Move image down"
                disabled={i === props.urls.length - 1}
                onClick={() => props.onReorder(reorderImageLine(props.imagesText, i, 1))}
                className="rounded border border-slate-600 px-1 text-[10px] text-slate-300 hover:bg-slate-800 disabled:opacity-30"
              >
                ↓
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OptionRowsEditor(props: {
  rows: OptionRow[];
  onChange: (rows: OptionRow[]) => void;
  advancedJson: string;
  onAdvancedChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Variant options</p>
      {props.rows.map((row, i) => (
        <div key={i} className="flex flex-wrap gap-2 sm:flex-nowrap">
          <input
            placeholder="Key (e.g. size)"
            disabled={props.disabled}
            className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-950 px-2 py-1.5 text-xs text-white sm:max-w-[140px]"
            value={row.key}
            onChange={(e) => {
              const next = [...props.rows];
              next[i] = { ...row, key: e.target.value };
              props.onChange(next);
            }}
          />
          <input
            placeholder="Value (e.g. M)"
            disabled={props.disabled}
            className="min-w-0 flex-[2] rounded-lg border border-slate-600 bg-slate-950 px-2 py-1.5 text-xs text-white"
            value={row.value}
            onChange={(e) => {
              const next = [...props.rows];
              next[i] = { ...row, value: e.target.value };
              props.onChange(next);
            }}
          />
          <button
            type="button"
            disabled={props.disabled || props.rows.length <= 1}
            className="shrink-0 rounded-lg border border-slate-600 px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 disabled:opacity-30"
            onClick={() => props.onChange(props.rows.filter((_, j) => j !== i))}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={props.disabled}
        className="text-xs font-medium text-indigo-300 hover:underline"
        onClick={() => props.onChange([...props.rows, { key: "", value: "" }])}
      >
        + Add option row
      </button>
      <details className="rounded-lg border border-slate-800 bg-slate-950/40 p-2">
        <summary className="cursor-pointer text-xs font-medium text-slate-400">Advanced JSON merge (optional)</summary>
        <p className="mt-2 text-[11px] text-slate-500">
          Parsed object is merged over the rows above; duplicate keys use JSON values.
        </p>
        <textarea
          rows={2}
          disabled={props.disabled}
          placeholder="{}"
          className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 px-2 py-1.5 font-mono text-[11px] text-white"
          value={props.advancedJson}
          onChange={(e) => props.onAdvancedChange(e.target.value)}
        />
      </details>
    </div>
  );
}

export function ProductsManager(props: { initialProducts: ProductRow[]; siteUrl: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [products, setProducts] = useState(props.initialProducts);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "jersey" | "footwear">("all");
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [variantAddByProduct, setVariantAddByProduct] = useState<Record<string, VariantAddDraft>>({});
  const [editingVariant, setEditingVariant] = useState<VariantEditDraft | null>(null);
  const [destructiveConfirm, setDestructiveConfirm] = useState<DestructiveConfirm | null>(null);
  const [destructiveTyped, setDestructiveTyped] = useState("");
  const productImageFileRef = useRef<HTMLInputElement>(null);
  const [imageUploadPending, setImageUploadPending] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  const clientImageRules = useMemo(
    () =>
      parseProductImageRulesFromOptions({
        nextPublicSupabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        allowedImageUrlPrefixesCsv: process.env.NEXT_PUBLIC_ALLOWED_IMAGE_URL_PREFIXES,
      }),
    [],
  );

  const sorted = useMemo(
    () => [...products].sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name)),
    [products],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sorted.filter((p) => {
      if (typeFilter !== "all" && p.type !== typeFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.variants.some((v) => v.sku.toLowerCase().includes(q) || v.label.toLowerCase().includes(q))
      );
    });
  }, [sorted, search, typeFilter]);

  function applyField<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function getVariantAddDraft(productId: string): VariantAddDraft {
    return variantAddByProduct[productId] ?? emptyVariantAdd();
  }

  function setVariantAddDraft(productId: string, patch: Partial<VariantAddDraft>) {
    setVariantAddByProduct((m) => ({
      ...m,
      [productId]: { ...getVariantAddDraft(productId), ...patch },
    }));
  }

  function loadForEdit(product: ProductRow) {
    setEditingId(product.id);
    setDraft({
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      type: product.type,
      basePriceMajor: centsToMajorInput(product.basePriceCents),
      imagesText: product.images.join("\n"),
    });
    setError(null);
    setNotice(null);
  }

  function resetForm() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  }

  function validateDraft(): string | null {
    return analyzeProductDraft(draft, clientImageRules).firstError;
  }

  async function onProductImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImageUploadError(null);
    setImageUploadPending(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/uploads/product-image", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setImageUploadError(typeof data.error === "string" ? data.error : "Upload failed.");
        return;
      }
      const url = data.url as string | undefined;
      if (!url) {
        setImageUploadError("Upload response missing URL.");
        return;
      }
      setDraft((d) => ({
        ...d,
        imagesText: d.imagesText.trim() ? `${d.imagesText.trim()}\n${url}` : url,
      }));
      setNotice("Image uploaded — save the product when ready.");
    } finally {
      setImageUploadPending(false);
    }
  }

  function submitCreateOrUpdate() {
    const v = validateDraft();
    if (v) {
      setError(v);
      return;
    }
    const price = parseMajorToCents(draft.basePriceMajor);
    if (!price.ok) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch("/api/products", {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: editingId ?? undefined,
          slug: draft.slug,
          name: draft.name,
          description: draft.description,
          type: draft.type,
          basePriceCents: price.cents,
          images: normalizeImages(draft.imagesText),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not save product.");
        return;
      }

      if (editingId) {
        setProducts((rows) =>
          rows.map((r) =>
            r.id === editingId
              ? {
                  ...r,
                  slug: draft.slug.trim().toLowerCase(),
                  name: draft.name.trim(),
                  description: draft.description.trim(),
                  type: draft.type,
                  basePriceCents: price.cents,
                  images: normalizeImages(draft.imagesText),
                }
              : r,
          ),
        );
        setNotice("Product updated.");
      } else {
        const p = data.product as Omit<ProductRow, "variantsCount" | "totalStock" | "variants"> | undefined;
        const dv = data.defaultVariant as
          | {
              id: string;
              productId: string;
              sku: string;
              label: string;
              priceModifierCents: number;
              stock: number;
              options: Record<string, string> | null;
            }
          | null
          | undefined;
        if (p) {
          const variants: VariantRow[] = dv
            ? [
                {
                  id: dv.id,
                  productId: dv.productId,
                  sku: dv.sku,
                  label: dv.label,
                  priceModifierCents: dv.priceModifierCents,
                  stock: dv.stock,
                  options: (dv.options ?? {}) as Record<string, string>,
                },
              ]
            : [];
          const row: ProductRow = {
            ...(p as ProductRow),
            variants,
            variantsCount: variants.length,
            totalStock: variants.reduce((s, v) => s + v.stock, 0),
          };
          setProducts((rows) => [row, ...rows]);
        }
        setNotice("Product created.");
      }
      resetForm();
    });
  }

  function confirmDeleteProduct(id: string, name: string) {
    setDestructiveConfirm({ kind: "product", id, name });
    setDestructiveTyped("");
  }

  function confirmDeleteVariant(productId: string, variantId: string, sku: string) {
    setDestructiveConfirm({ kind: "variant", productId, variantId, sku });
    setDestructiveTyped("");
  }

  function executeConfirmedDelete() {
    if (!destructiveConfirm) return;
    if (destructiveConfirm.kind === "product") {
      if (destructiveTyped !== destructiveConfirm.name) return;
      const id = destructiveConfirm.id;
      const name = destructiveConfirm.name;
      setDestructiveConfirm(null);
      setDestructiveTyped("");
      void runDeleteProduct(id, name);
      return;
    }
    if (destructiveTyped !== destructiveConfirm.sku) return;
    const { productId, variantId, sku } = destructiveConfirm;
    setDestructiveConfirm(null);
    setDestructiveTyped("");
    void runDeleteVariant(productId, variantId, sku);
  }

  function runDeleteProduct(id: string, name: string) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await fetch(`/api/products?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not delete product.");
        return;
      }
      setProducts((rows) => rows.filter((r) => r.id !== id));
      if (editingId === id) resetForm();
      if (expandedProductId === id) {
        setExpandedProductId(null);
        setEditingVariant(null);
      }
      setNotice(`Deleted “${name}”.`);
    });
  }

  function runDeleteVariant(productId: string, variantId: string, sku: string) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await fetch(`/api/product-variants?id=${encodeURIComponent(variantId)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not delete variant.");
        return;
      }
      setProducts((rows) =>
        rows.map((p) => {
          if (p.id !== productId) return p;
          const variants = p.variants.filter((x) => x.id !== variantId);
          return { ...p, variants, ...totalsFromVariants(variants) };
        }),
      );
      if (editingVariant?.id === variantId) setEditingVariant(null);
      setNotice(`Deleted variant ${sku}.`);
    });
  }

  function toggleVariants(productId: string) {
    setExpandedProductId((cur) => (cur === productId ? null : productId));
    setEditingVariant(null);
    setError(null);
    if (!variantAddByProduct[productId]) {
      setVariantAddByProduct((m) => ({ ...m, [productId]: emptyVariantAdd() }));
    }
  }

  function createVariant(productId: string) {
    const add = getVariantAddDraft(productId);
    if (!add.sku.trim() || !add.label.trim()) {
      setError("Variant SKU and label are required.");
      return;
    }
    const pm = parseMajorToCents(add.priceModifierMajor);
    if (!pm.ok) {
      setError(pm.error);
      return;
    }
    const merged = mergeOptionsWithAdvanced(optionsFromRows(add.optionRows), add.advancedJson);
    if (!merged.ok) {
      setError(merged.error);
      return;
    }
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await fetch("/api/product-variants", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productId,
          sku: add.sku,
          label: add.label,
          priceModifierCents: pm.cents,
          stock: add.stock,
          options: merged.value,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not create variant.");
        return;
      }
      const v = data.variant as VariantRow | undefined;
      if (v) {
        setProducts((rows) =>
          rows.map((p) => {
            if (p.id !== productId) return p;
            const variants = [...p.variants, v];
            return { ...p, variants, ...totalsFromVariants(variants) };
          }),
        );
        setVariantAddByProduct((m) => ({ ...m, [productId]: emptyVariantAdd() }));
        setNotice("Variant created.");
      }
    });
  }

  function saveVariantEdit() {
    if (!editingVariant) return;
    const pm = parseMajorToCents(editingVariant.priceModifierMajor);
    if (!pm.ok) {
      setError(pm.error);
      return;
    }
    const merged = mergeOptionsWithAdvanced(optionsFromRows(editingVariant.optionRows), editingVariant.advancedJson);
    if (!merged.ok) {
      setError(merged.error);
      return;
    }
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await fetch("/api/product-variants", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: editingVariant.id,
          sku: editingVariant.sku,
          label: editingVariant.label,
          priceModifierCents: pm.cents,
          stock: editingVariant.stock,
          options: merged.value,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not update variant.");
        return;
      }
      const ev = editingVariant;
      setProducts((rows) =>
        rows.map((p) => {
          const variants = p.variants.map((x) =>
            x.id === ev.id
              ? {
                  ...x,
                  sku: ev.sku.trim(),
                  label: ev.label.trim(),
                  priceModifierCents: pm.cents,
                  stock: ev.stock,
                  options: merged.value,
                }
              : x,
          );
          return { ...p, variants, ...totalsFromVariants(variants) };
        }),
      );
      setEditingVariant(null);
      setNotice("Variant updated.");
    });
  }

  const imageUrls = useMemo(() => normalizeImages(draft.imagesText), [draft.imagesText]);

  const storefrontProductUrl = useMemo(() => {
    const base = props.siteUrl.replace(/\/$/, "");
    const s = draft.slug.trim().toLowerCase();
    if (!s) return null;
    return `${base}/products/${s}`;
  }, [props.siteUrl, draft.slug]);

  const descriptionLen = draft.description.length;
  const descMax = 2000;

  const draftAnalysis = useMemo(
    () => analyzeProductDraft(draft, clientImageRules),
    [draft, clientImageRules],
  );
  const nameLen = draft.name.trim().length;

  const expectedDestructive =
    destructiveConfirm?.kind === "product" ? destructiveConfirm.name : destructiveConfirm?.sku ?? "";
  const destructiveReady = destructiveTyped === expectedDestructive && expectedDestructive.length > 0;

  return (
    <div className="space-y-6">
      {destructiveConfirm ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">
              {destructiveConfirm.kind === "product" ? "Delete product" : "Delete variant"}
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              {destructiveConfirm.kind === "product" ? (
                <>
                  This removes <span className="font-medium text-slate-200">{destructiveConfirm.name}</span> and all its
                  variants. Type the product name exactly to confirm.
                </>
              ) : (
                <>
                  Permanently remove SKU{" "}
                  <span className="font-mono font-medium text-indigo-200">{destructiveConfirm.sku}</span>. Type the SKU to
                  confirm.
                </>
              )}
            </p>
            <input
              autoFocus
              className="mt-4 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-2.5 text-sm text-white"
              value={destructiveTyped}
              onChange={(e) => setDestructiveTyped(e.target.value)}
              placeholder={expectedDestructive}
            />
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
                onClick={() => {
                  setDestructiveConfirm(null);
                  setDestructiveTyped("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!destructiveReady || pending}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-40"
                onClick={executeConfirmedDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-800/90 bg-slate-900/70 p-5 shadow-xl shadow-black/25 sm:p-6">
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-base font-semibold tracking-tight text-white">
            {editingId ? "Edit product" : "Create product"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            This is the <span className="text-slate-300">parent product</span> (name, URL, base price, description, images).
            After saving, add <span className="text-slate-300">sizes and SKUs</span> in the catalog table below — each
            variant can adjust price and stock.
          </p>
        </div>

        <div className="mt-6 space-y-6">
          <div className="rounded-xl border border-slate-800/90 bg-slate-950/40 p-4 sm:p-5">
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-indigo-200/90">Identity & URL</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              The slug becomes the public path. Use lowercase letters, numbers, and hyphens only (no spaces). Stored
              lowercase on save.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <label htmlFor="product-slug" className="text-sm font-medium text-slate-200">
                    Slug <span className="font-normal text-slate-500">(required)</span>
                  </label>
                  <span
                    className={`text-xs tabular-nums ${
                      draftAnalysis.slugNormalized.length > 120 ? "text-red-400" : "text-slate-500"
                    }`}
                  >
                    {draftAnalysis.slugNormalized.length} / 120
                  </span>
                </div>
                <input
                  id="product-slug"
                  autoComplete="off"
                  maxLength={120}
                  placeholder="real-madrid-home-25-26"
                  aria-invalid={draft.slug.trim() ? !draftAnalysis.slugLenOk : undefined}
                  aria-describedby={
                    draftAnalysis.slugInlineError || draftAnalysis.slugFormatWarning
                      ? "product-slug-hint"
                      : undefined
                  }
                  className={`w-full rounded-xl bg-slate-950/80 px-3 py-2.5 font-mono text-sm text-white placeholder:text-slate-600 ${
                    draft.slug.trim() && !draftAnalysis.slugLenOk
                      ? "border border-red-500/50 ring-1 ring-red-500/20"
                      : draft.slug.trim() && draftAnalysis.slugLenOk && !draftAnalysis.slugUrlShapeOk
                        ? "border border-amber-600/50 ring-1 ring-amber-600/20"
                        : "border border-slate-700"
                  }`}
                  value={draft.slug}
                  onChange={(e) => applyField("slug", e.target.value)}
                />
                {draftAnalysis.slugInlineError || draftAnalysis.slugFormatWarning ? (
                  <p
                    id="product-slug-hint"
                    className={`text-xs ${draftAnalysis.slugInlineError ? "text-red-300/90" : "text-amber-200/85"}`}
                    role="status"
                  >
                    {draftAnalysis.slugInlineError ?? draftAnalysis.slugFormatWarning}
                  </p>
                ) : null}
                {storefrontProductUrl ? (
                  <p className="text-xs text-slate-500">
                    Storefront URL:{" "}
                    <a
                      href={storefrontProductUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all font-mono text-indigo-300 hover:underline"
                    >
                      {storefrontProductUrl}
                    </a>
                  </p>
                ) : (
                  <p className="text-xs text-slate-600">Enter a slug to preview the public product URL.</p>
                )}
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <label htmlFor="product-name" className="text-sm font-medium text-slate-200">
                    Display name <span className="font-normal text-slate-500">(required)</span>
                  </label>
                  <span
                    className={`text-xs tabular-nums ${nameLen > 160 ? "text-red-400" : "text-slate-500"}`}
                    aria-live="polite"
                  >
                    {nameLen} / 160
                  </span>
                </div>
                <input
                  id="product-name"
                  maxLength={160}
                  placeholder="Shown on product cards and checkout"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-white placeholder:text-slate-600"
                  value={draft.name}
                  onChange={(e) => applyField("name", e.target.value)}
                />
                <p className="text-xs text-slate-500">Customer-facing title. You can change it anytime.</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800/90 bg-slate-950/40 p-4 sm:p-5">
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-indigo-200/90">Category & base price</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Category drives storefront behavior (e.g. jersey customization). Base price is in{" "}
              <span className="text-slate-400">Ghana cedis (GH₵)</span>; variant rows add or subtract from this.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="product-type" className="block text-sm font-medium text-slate-200">
                  Product type
                </label>
                <select
                  id="product-type"
                  className="w-full min-h-11 rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-white"
                  value={draft.type}
                  onChange={(e) => applyField("type", e.target.value as "jersey" | "footwear")}
                >
                  <option value="jersey">Jersey — kits, names/numbers at checkout</option>
                  <option value="footwear">Footwear — brand search & sizing</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="product-base-price" className="block text-sm font-medium text-slate-200">
                  Base price (GH₵)
                </label>
                <input
                  id="product-base-price"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-white placeholder:text-slate-600"
                  value={draft.basePriceMajor}
                  onChange={(e) => applyField("basePriceMajor", e.target.value)}
                />
                <p className="text-xs text-slate-500">
                  Enter major units (e.g. <span className="tabular-nums text-slate-400">199.99</span>). We store minor
                  units in the database.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800/90 bg-slate-950/40 p-4 sm:p-5">
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-indigo-200/90">Storefront description</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Long-form copy for the product detail page. Required by the API; aim for material, fit, and care notes.
            </p>
            <div className="mt-4 space-y-1.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <label htmlFor="product-description" className="text-sm font-medium text-slate-200">
                  Description <span className="font-normal text-slate-500">(required)</span>
                </label>
                <span
                  className={`text-xs tabular-nums ${
                    descriptionLen > descMax
                      ? "text-red-400"
                      : draft.description.trim().length > 0 && draft.description.trim().length < 5
                        ? "text-amber-300/90"
                        : "text-slate-500"
                  }`}
                  aria-live="polite"
                >
                  {descriptionLen} / {descMax}
                  {draft.description.trim().length < 5 && draft.description.trim().length > 0 ? (
                    <span className="ml-2 text-amber-200/80">(min 5)</span>
                  ) : null}
                </span>
              </div>
              <textarea
                id="product-description"
                rows={5}
                placeholder="Full product story: fabric, fit, club details, washing instructions…"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-white placeholder:text-slate-600"
                value={draft.description}
                onChange={(e) => applyField("description", e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-800/90 bg-slate-950/40 p-4 sm:p-5">
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-indigo-200/90">Images</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              One URL per line; order matters. First image is typically used as the hero on listing grids. Add bundled
              paths (<code className="rounded bg-slate-900 px-1 font-mono text-[11px] text-slate-400">/images/…</code>)
              or use <span className="text-slate-400">Upload picture</span> to push a file to Supabase (when configured).
            </p>

            <input
              ref={productImageFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              aria-hidden
              tabIndex={-1}
              onChange={onProductImageFileChange}
            />

            <div className="mt-4 rounded-xl border border-indigo-500/25 bg-indigo-950/20 p-4">
              <p className="text-sm font-medium text-slate-200">Add images</p>
              <p className="mt-1 text-xs text-slate-500">
                Upload a JPEG, PNG, or WebP (max 5MB). The public URL is appended to the list below — save the product when
                you are done.
              </p>
              <button
                type="button"
                disabled={imageUploadPending || pending}
                onClick={() => productImageFileRef.current?.click()}
                aria-label="Upload picture from your device"
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/30 hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {imageUploadPending ? (
                  "Uploading…"
                ) : (
                  <>
                    <svg
                      className="h-5 w-5 shrink-0"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                      />
                    </svg>
                    Upload picture
                  </>
                )}
              </button>
              <p className="mt-2 text-[11px] text-slate-500">
                Requires Supabase env on the server. Same-origin paths or{" "}
                <code className="text-slate-400">ALLOWED_IMAGE_URL_PREFIXES</code> still work if you paste URLs instead.
              </p>
              {imageUploadError ? <p className="mt-2 text-xs text-red-400">{imageUploadError}</p> : null}
            </div>

            <div className="mt-6 space-y-1.5">
              <label htmlFor="product-images" className="block text-sm font-medium text-slate-200">
                Image URLs
              </label>
              <textarea
                id="product-images"
                rows={4}
                placeholder="/images/catalog/my-product.jpg"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 font-mono text-xs text-white placeholder:text-slate-600 sm:text-sm"
                value={draft.imagesText}
                onChange={(e) => applyField("imagesText", e.target.value)}
              />
              <p className="text-xs text-slate-500">
                Allowed: same-origin paths, HTTPS on your Supabase public bucket, or URLs matching{" "}
                <code className="text-slate-400">ALLOWED_IMAGE_URL_PREFIXES</code>.
              </p>
            </div>
          </div>
        </div>

        <ImagePreviewStrip
          urls={imageUrls}
          imagesText={draft.imagesText}
          onReorder={(next) => applyField("imagesText", next)}
        />

        <div className="mt-6 rounded-xl border border-slate-800/90 bg-slate-950/50 p-4 sm:p-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-indigo-200/90">Ready to save</h3>
          <p className="mt-1 text-xs text-slate-500">
            These checks mirror the product API. The save button stays disabled until everything passes.
          </p>
          <ul className="mt-3 space-y-2">
            {draftAnalysis.checklist.map((item) => (
              <li key={item.id} className="flex items-start gap-2 text-sm">
                <span
                  className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    item.ok ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-500"
                  }`}
                  aria-hidden
                >
                  {item.ok ? "✓" : "·"}
                </span>
                <span className={item.ok ? "text-slate-300" : "text-slate-500"}>{item.label}</span>
              </li>
            ))}
          </ul>
          {normalizeImages(draft.imagesText).length === 0 ? (
            <p className="mt-3 text-xs text-amber-200/85">
              Tip: add at least one image so listings and the product page have a hero — optional for saving.
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={pending || !draftAnalysis.ready}
            onClick={submitCreateOrUpdate}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
            title={!draftAnalysis.ready ? "Complete the checklist above" : undefined}
          >
            {pending ? "Saving..." : editingId ? "Save changes" : "Create product"}
          </button>
          {editingId ? (
            <button
              type="button"
              disabled={pending}
              onClick={resetForm}
              className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              Cancel edit
            </button>
          ) : null}
        </div>
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
        {notice ? <p className="mt-3 text-sm text-emerald-300">{notice}</p> : null}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-900/70 shadow-xl shadow-black/25">
        <div className="border-b border-slate-800 bg-slate-900/90 p-4 sm:flex sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Catalog</h2>
            <p className="mt-1 text-xs text-slate-500">{filtered.length} product(s)</p>
          </div>
          <div className="mt-3 flex w-full flex-col gap-2 sm:mt-0 sm:w-auto sm:flex-row sm:items-center">
            <input
              type="search"
              placeholder="Search name, slug, SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white sm:w-56"
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as "all" | "jersey" | "footwear")}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white sm:w-40"
            >
              <option value="all">All types</option>
              <option value="jersey">Jersey</option>
              <option value="footwear">Footwear</option>
            </select>
          </div>
        </div>

        <div className="md:hidden space-y-3 p-4">
          {filtered.map((product) => (
            <div key={product.id} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-lg shadow-black/20">
              <div className="flex flex-col gap-2">
                <p className="font-medium text-white">{product.name}</p>
                <p className="font-mono text-xs text-slate-500">{product.slug}</p>
                <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 capitalize">{product.type}</span>
                  <span className="tabular-nums">{formatMoneyCents(product.basePriceCents)} base</span>
                  <span>
                    {product.variantsCount} variant(s) · {product.totalStock} stock
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-3">
                  <button
                    type="button"
                    className={
                      expandedProductId === product.id
                        ? "rounded-lg bg-indigo-500/25 px-3 py-1.5 text-xs font-medium text-indigo-200 ring-1 ring-indigo-400/40"
                        : "rounded-lg px-3 py-1.5 text-xs font-medium text-indigo-300 ring-1 ring-slate-700 hover:bg-slate-800"
                    }
                    onClick={() => toggleVariants(product.id)}
                  >
                    {expandedProductId === product.id ? "Hide variants" : "Variants"}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-indigo-300 ring-1 ring-slate-700 hover:bg-slate-800"
                    onClick={() => loadForEdit(product)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-300 ring-1 ring-slate-700 hover:bg-slate-800"
                    onClick={() => confirmDeleteProduct(product.id, product.name)}
                  >
                    Delete
                  </button>
                  <a
                    href={`${props.siteUrl}/products/${product.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-300 ring-1 ring-slate-700 hover:bg-slate-800"
                  >
                    View store
                  </a>
                </div>
              </div>
              {expandedProductId === product.id ? (
                <div className="mt-4 space-y-4 border-t border-slate-800 pt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Variant SKUs</p>
                  {product.variants.map((v) => (
                    <Fragment key={v.id}>
                      {editingVariant?.id === v.id ? (
                        <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-3 space-y-2">
                          <input
                            className="w-full rounded-lg border border-slate-600 bg-slate-950 px-2 py-1.5 text-xs text-white"
                            value={editingVariant.sku}
                            onChange={(e) => setEditingVariant({ ...editingVariant, sku: e.target.value })}
                            placeholder="SKU"
                          />
                          <input
                            className="w-full rounded-lg border border-slate-600 bg-slate-950 px-2 py-1.5 text-xs text-white"
                            value={editingVariant.label}
                            onChange={(e) => setEditingVariant({ ...editingVariant, label: e.target.value })}
                            placeholder="Label"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <label>
                              <span className="text-[10px] text-slate-500">Stock</span>
                              <input
                                type="number"
                                min={0}
                                className="mt-0.5 w-full rounded-lg border border-slate-600 bg-slate-950 px-2 py-1.5 text-xs text-white"
                                value={editingVariant.stock}
                                onChange={(e) =>
                                  setEditingVariant({ ...editingVariant, stock: Number(e.target.value) })
                                }
                              />
                            </label>
                            <label>
                              <span className="text-[10px] text-slate-500">Price ± (GH₵)</span>
                              <input
                                type="text"
                                inputMode="decimal"
                                className="mt-0.5 w-full rounded-lg border border-slate-600 bg-slate-950 px-2 py-1.5 text-xs text-white"
                                value={editingVariant.priceModifierMajor}
                                onChange={(e) =>
                                  setEditingVariant({ ...editingVariant, priceModifierMajor: e.target.value })
                                }
                              />
                            </label>
                          </div>
                          <OptionRowsEditor
                            rows={editingVariant.optionRows}
                            onChange={(rows) => setEditingVariant({ ...editingVariant, optionRows: rows })}
                            advancedJson={editingVariant.advancedJson}
                            onAdvancedChange={(advancedJson) => setEditingVariant({ ...editingVariant, advancedJson })}
                            disabled={pending}
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={pending}
                              onClick={saveVariantEdit}
                              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingVariant(null)}
                              className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-mono text-[11px] text-indigo-200">{v.sku}</p>
                              <p className="text-sm text-slate-200">{v.label}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                Stock {v.stock} · modifier {formatMoneyCents(v.priceModifierCents)}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="text-xs font-medium text-indigo-300 hover:underline"
                              onClick={() =>
                                setEditingVariant({
                                  id: v.id,
                                  sku: v.sku,
                                  label: v.label,
                                  stock: v.stock,
                                  priceModifierMajor: centsToMajorInput(v.priceModifierCents),
                                  optionRows: optionRowsFromRecord(v.options ?? {}),
                                  advancedJson: "",
                                })
                              }
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="text-xs font-medium text-red-300 hover:underline"
                              onClick={() => confirmDeleteVariant(product.id, v.id, v.sku)}
                            >
                              Delete
                            </button>
                            <Link
                              href={`/inventory?variantId=${encodeURIComponent(v.id)}`}
                              className="text-xs font-medium text-slate-400 hover:underline"
                            >
                              Inventory
                            </Link>
                          </div>
                        </div>
                      )}
                    </Fragment>
                  ))}
                  <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 space-y-3">
                    <p className="text-xs font-semibold text-slate-300">Add variant</p>
                    <input
                      placeholder="SKU"
                      className="w-full rounded-lg border border-slate-600 bg-slate-950 px-2 py-1.5 text-xs text-white"
                      value={getVariantAddDraft(product.id).sku}
                      onChange={(e) => setVariantAddDraft(product.id, { sku: e.target.value })}
                    />
                    <input
                      placeholder="Label (e.g. Size M)"
                      className="w-full rounded-lg border border-slate-600 bg-slate-950 px-2 py-1.5 text-xs text-white"
                      value={getVariantAddDraft(product.id).label}
                      onChange={(e) => setVariantAddDraft(product.id, { label: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <label>
                        <span className="text-[10px] text-slate-500">Stock</span>
                        <input
                          type="number"
                          min={0}
                          className="mt-0.5 w-full rounded-lg border border-slate-600 bg-slate-950 px-2 py-1.5 text-xs text-white"
                          value={getVariantAddDraft(product.id).stock}
                          onChange={(e) => setVariantAddDraft(product.id, { stock: Number(e.target.value) })}
                        />
                      </label>
                      <label>
                        <span className="text-[10px] text-slate-500">Price ± (GH₵)</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          className="mt-0.5 w-full rounded-lg border border-slate-600 bg-slate-950 px-2 py-1.5 text-xs text-white"
                          value={getVariantAddDraft(product.id).priceModifierMajor}
                          onChange={(e) => setVariantAddDraft(product.id, { priceModifierMajor: e.target.value })}
                        />
                      </label>
                    </div>
                    <OptionRowsEditor
                      rows={getVariantAddDraft(product.id).optionRows}
                      onChange={(rows) => setVariantAddDraft(product.id, { optionRows: rows })}
                      advancedJson={getVariantAddDraft(product.id).advancedJson}
                      onAdvancedChange={(advancedJson) => setVariantAddDraft(product.id, { advancedJson })}
                      disabled={pending}
                    />
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => createVariant(product.id)}
                      className="w-full rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                    >
                      Add variant
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">No products match your filters.</p>
          ) : null}
        </div>

        <div className="hidden md:block">
          <p className="mb-3 text-center text-xs text-slate-500">
            Use <span className="font-semibold text-red-200">Delete</span> under each product name to remove it from the
            storefront.
          </p>
          <div className="max-w-full overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/90 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 pl-0 sm:px-5 sm:pl-0">Product</th>
                <th className="px-2 py-3 sm:px-5">Type</th>
                <th className="px-2 py-3 sm:px-5">Base price</th>
                <th className="px-2 py-3 sm:px-5">Variants</th>
                <th className="px-2 py-3 pr-0 sm:px-5 sm:pr-0">Total stock</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product, idx) => (
                <Fragment key={product.id}>
                  <tr className={`border-b border-slate-800/80 text-slate-200 ${idx % 2 === 1 ? "bg-slate-900/40" : ""}`}>
                    <td className="px-4 py-3.5 pl-0 align-top sm:px-5 sm:pl-0">
                      <p className="font-medium text-white">{product.name}</p>
                      <p className="mt-1 max-w-[20rem] truncate text-xs text-slate-500">{product.slug}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={`inline-flex min-h-9 min-w-0 items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium ${
                            expandedProductId === product.id
                              ? "bg-indigo-500/25 text-indigo-200 ring-1 ring-indigo-400/40"
                              : "text-indigo-200 ring-1 ring-slate-600 hover:bg-slate-800"
                          }`}
                          onClick={() => toggleVariants(product.id)}
                        >
                          {expandedProductId === product.id ? "Hide variants" : "Variants"}
                        </button>
                        <button
                          type="button"
                          className="inline-flex min-h-9 items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium text-indigo-200 ring-1 ring-slate-600 hover:bg-slate-800"
                          onClick={() => loadForEdit(product)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="inline-flex min-h-9 min-w-[5.5rem] items-center justify-center rounded-lg border-2 border-red-400/60 bg-red-950/60 px-3 py-1.5 text-xs font-bold tracking-wide text-red-100 shadow-sm hover:bg-red-900/50"
                          onClick={() => confirmDeleteProduct(product.id, product.name)}
                        >
                          Delete
                        </button>
                        <a
                          href={`${props.siteUrl}/products/${product.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-9 items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium text-slate-200 ring-1 ring-slate-600 hover:bg-slate-800"
                        >
                          View
                        </a>
                      </div>
                    </td>
                    <td className="px-2 py-3.5 align-top capitalize sm:px-5">{product.type}</td>
                    <td className="px-2 py-3.5 align-top tabular-nums sm:px-5">
                      {formatMoneyCents(product.basePriceCents)}
                    </td>
                    <td className="px-2 py-3.5 align-top sm:px-5">{product.variantsCount}</td>
                    <td className="px-2 py-3.5 align-top pr-0 sm:px-5 sm:pr-0">{product.totalStock}</td>
                  </tr>
                  {expandedProductId === product.id ? (
                    <tr className="border-b border-slate-800/80 bg-slate-950/40">
                      <td colSpan={5} className="px-4 py-4 pl-0 sm:px-5 sm:pl-0">
                        <div className="space-y-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Variant SKUs</p>
                          <div className="overflow-x-auto rounded-xl border border-slate-800">
                            <table className="w-full min-w-[640px] text-left text-xs">
                              <thead className="bg-slate-900/80 text-[10px] uppercase text-slate-500">
                                <tr>
                                  <th className="px-3 py-2">SKU</th>
                                  <th className="px-3 py-2">Label</th>
                                  <th className="px-3 py-2">Stock</th>
                                  <th className="px-3 py-2">Price ±</th>
                                  <th className="px-3 py-2">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {product.variants.map((v) => (
                                  <Fragment key={v.id}>
                                    {editingVariant?.id === v.id ? (
                                      <tr className="border-t border-slate-800 bg-slate-900/50">
                                        <td className="px-3 py-2">
                                          <input
                                            className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1 text-white"
                                            value={editingVariant.sku}
                                            onChange={(e) => setEditingVariant({ ...editingVariant, sku: e.target.value })}
                                          />
                                        </td>
                                        <td className="px-3 py-2">
                                          <input
                                            className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1 text-white"
                                            value={editingVariant.label}
                                            onChange={(e) =>
                                              setEditingVariant({ ...editingVariant, label: e.target.value })
                                            }
                                          />
                                        </td>
                                        <td className="px-3 py-2">
                                          <input
                                            type="number"
                                            min={0}
                                            className="w-20 rounded border border-slate-600 bg-slate-950 px-2 py-1 text-white"
                                            value={editingVariant.stock}
                                            onChange={(e) =>
                                              setEditingVariant({
                                                ...editingVariant,
                                                stock: Number(e.target.value),
                                              })
                                            }
                                          />
                                        </td>
                                        <td className="px-3 py-2">
                                          <input
                                            type="text"
                                            inputMode="decimal"
                                            className="w-24 rounded border border-slate-600 bg-slate-950 px-2 py-1 text-white"
                                            value={editingVariant.priceModifierMajor}
                                            onChange={(e) =>
                                              setEditingVariant({
                                                ...editingVariant,
                                                priceModifierMajor: e.target.value,
                                              })
                                            }
                                          />
                                        </td>
                                        <td className="px-3 py-2">
                                          <div className="flex flex-wrap gap-2">
                                            <button
                                              type="button"
                                              disabled={pending}
                                              onClick={saveVariantEdit}
                                              className="text-indigo-300 hover:underline disabled:opacity-50"
                                            >
                                              Save
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setEditingVariant(null)}
                                              className="text-slate-400 hover:underline"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ) : (
                                      <tr className="border-t border-slate-800 text-slate-300">
                                        <td className="px-3 py-2 font-mono text-[11px]">{v.sku}</td>
                                        <td className="px-3 py-2">{v.label}</td>
                                        <td className="px-3 py-2 tabular-nums">{v.stock}</td>
                                        <td className="px-3 py-2 tabular-nums">{formatMoneyCents(v.priceModifierCents)}</td>
                                        <td className="px-3 py-2">
                                          <button
                                            type="button"
                                            className="mr-3 text-indigo-300 hover:underline"
                                            onClick={() =>
                                              setEditingVariant({
                                                id: v.id,
                                                sku: v.sku,
                                                label: v.label,
                                                stock: v.stock,
                                                priceModifierMajor: centsToMajorInput(v.priceModifierCents),
                                                optionRows: optionRowsFromRecord(v.options ?? {}),
                                                advancedJson: "",
                                              })
                                            }
                                          >
                                            Edit
                                          </button>
                                          <button
                                            type="button"
                                            className="mr-3 text-red-300 hover:underline"
                                            onClick={() => confirmDeleteVariant(product.id, v.id, v.sku)}
                                          >
                                            Delete
                                          </button>
                                          <Link
                                            href={`/inventory?variantId=${encodeURIComponent(v.id)}`}
                                            className="text-slate-400 hover:underline"
                                          >
                                            Inventory
                                          </Link>
                                        </td>
                                      </tr>
                                    )}
                                    {editingVariant?.id === v.id ? (
                                      <tr className="border-t border-slate-800 bg-slate-900/50">
                                        <td colSpan={5} className="px-3 py-3">
                                          <OptionRowsEditor
                                            rows={editingVariant.optionRows}
                                            onChange={(rows) => setEditingVariant({ ...editingVariant, optionRows: rows })}
                                            advancedJson={editingVariant.advancedJson}
                                            onAdvancedChange={(advancedJson) =>
                                              setEditingVariant({ ...editingVariant, advancedJson })
                                            }
                                            disabled={pending}
                                          />
                                        </td>
                                      </tr>
                                    ) : null}
                                  </Fragment>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                            <p className="text-xs font-semibold text-slate-300">Add variant</p>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                              <input
                                placeholder="SKU"
                                className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-1.5 text-xs text-white"
                                value={getVariantAddDraft(product.id).sku}
                                onChange={(e) => setVariantAddDraft(product.id, { sku: e.target.value })}
                              />
                              <input
                                placeholder="Label (e.g. Size M)"
                                className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-1.5 text-xs text-white"
                                value={getVariantAddDraft(product.id).label}
                                onChange={(e) => setVariantAddDraft(product.id, { label: e.target.value })}
                              />
                              <input
                                type="number"
                                min={0}
                                placeholder="Stock"
                                className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-1.5 text-xs text-white"
                                value={getVariantAddDraft(product.id).stock}
                                onChange={(e) => setVariantAddDraft(product.id, { stock: Number(e.target.value) })}
                              />
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder="Price ± (GH₵)"
                                className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-1.5 text-xs text-white"
                                value={getVariantAddDraft(product.id).priceModifierMajor}
                                onChange={(e) =>
                                  setVariantAddDraft(product.id, { priceModifierMajor: e.target.value })
                                }
                              />
                            </div>
                            <div className="mt-3">
                              <OptionRowsEditor
                                rows={getVariantAddDraft(product.id).optionRows}
                                onChange={(rows) => setVariantAddDraft(product.id, { optionRows: rows })}
                                advancedJson={getVariantAddDraft(product.id).advancedJson}
                                onAdvancedChange={(advancedJson) => setVariantAddDraft(product.id, { advancedJson })}
                                disabled={pending}
                              />
                            </div>
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => createVariant(product.id)}
                              className="mt-3 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                            >
                              Add variant
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td className="px-5 py-12 text-center text-slate-500" colSpan={5}>
                    No products match your filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          </div>
        </div>
      </section>
    </div>
  );
}
