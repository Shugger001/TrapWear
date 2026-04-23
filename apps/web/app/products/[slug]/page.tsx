import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { customizationTemplates, productVariants, products as productsTable } from "@trapwear/db";
import { ProductAddForm } from "@/components/product-add-form";
import { db } from "@/lib/db";
import { formatMoneyCents } from "@/lib/money";

const FOOTWEAR_BRANDS = [
  "Nike",
  "Adidas",
  "Puma",
  "Reebok",
  "Under Armour",
  "New Balance",
  "ASICS",
  "Fila",
  "Converse",
  "Vans",
  "Jordan",
  "Yeezy",
  "Supra",
  "Common Projects",
  "Gucci",
  "Louis Vuitton",
  "Prada",
  "Balenciaga",
  "Christian Louboutin",
  "Jimmy Choo",
  "Manolo Blahnik",
  "Steve Madden",
  "Aldo",
  "Nine West",
  "Sam Edelman",
  "Timberland",
  "Dr. Martens",
  "Clarks",
  "Caterpillar",
  "Columbia",
  "Merrell",
  "Crocs",
  "Birkenstock",
  "Skechers",
  "Hush Puppies",
  "Brooks",
  "Saucony",
  "Hoka",
  "On",
  "Salvatore Ferragamo",
  "Church's",
  "Allen Edmonds",
  "Johnston & Murphy",
  "Bathu",
  "Sole Rebels",
  "Ami Doshi Shah",
] as const;

const FOOTWEAR_IMAGE_POOL = [
  "/images/brands/nike.jpg",
  "/images/brands/adidas.jpg",
  "/images/brands/puma.jpg",
  "/images/brands/new-balance.jpg",
  "/images/brands/boots.jpg",
  "/images/brands/luxury.jpg",
  "/images/brands/running.jpg",
  "/images/brands/casual.jpg",
  "/images/brands/street.jpg",
  "/images/brands/heritage.jpg",
] as const;

const JERSEY_IMAGES_NORMAL = [
  "/images/jerseys/catalog/arsenal.jpg",
  "/images/jerseys/catalog/atletico-madrid.jpg",
  "/images/jerseys/catalog/barcelona-fc-soccer-jersey-available.jpg",
  "/images/jerseys/catalog/new-argentina-2026-worldcup-soccer-jersey.jpg",
  "/images/jerseys/catalog/nike-blue-psg-25-26-home-football-shirt-x-large-mens.jpg",
  "/images/jerseys/catalog/puma-x-pleasures-ac-milan-2023-24-football-jersey-mens-l-and-2xl.jpg",
  "/images/jerseys/catalog/real-madrid-home-jersey-25-26.jpg",
  "/images/jerseys/catalog/adidas-green-liverpool-fc-25-26-third-jersey-medium-mens.jpg",
  "/images/jerseys/catalog/visca-barca.jpg",
  "/images/jerseys/catalog/smaller-nations-shine-in-our-ranking-of-nikes-new-national-team-kits.jpg",
];

const JERSEY_IMAGES_VINTAGE = [
  "/images/jerseys/catalog/bayern-munich-1997-99.jpg",
  "/images/jerseys/catalog/celtic-retro-jersey.jpg",
  "/images/jerseys/catalog/manchester-united-classic-long-sleeve.jpg",
  "/images/jerseys/catalog/guide-de-tailles-pour-les-maillots-de-football-lineup-vintage-football-store.jpg",
  "/images/jerseys/catalog/1.jpg",
  "/images/jerseys/catalog/2.jpg",
  "/images/jerseys/catalog/3.jpg",
  "/images/jerseys/catalog/4.jpg",
  "/images/jerseys/catalog/5.jpg",
];

function getJerseyFallbackImage(name: string): string {
  const normalized = name.toLowerCase();
  const isVintage = /(vintage|retro|classic|heritage)/i.test(normalized);
  const pool = isVintage ? JERSEY_IMAGES_VINTAGE : JERSEY_IMAGES_NORMAL;
  const hash = Array.from(normalized).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return pool[hash % pool.length]!;
}

function inferFootwearBrand(name: string): string {
  const normalized = name.trim().toLowerCase();
  const matchedBrand = FOOTWEAR_BRANDS.find((brand) => normalized.startsWith(brand.toLowerCase()));
  if (matchedBrand) return matchedBrand;
  return name.trim().split(/\s+/)[0] ?? "";
}

function getFootwearFallbackImage(name: string): string {
  const normalized = name.toLowerCase();
  const hash = Array.from(normalized).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return FOOTWEAR_IMAGE_POOL[hash % FOOTWEAR_IMAGE_POOL.length]!;
}

function getProductDetailImage(product: { type: "jersey" | "footwear"; name: string; images: string[] }): string | null {
  const primary = product.images[0] ?? null;
  if (product.type === "jersey") {
    if (!primary || primary.endsWith(".svg")) return getJerseyFallbackImage(product.name);
    return primary;
  }
  if (!primary) return getFootwearFallbackImage(product.name);
  if (primary.endsWith(".svg")) return getFootwearFallbackImage(product.name);
  return primary;
}

export default async function ProductPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;

  const [product] = await db.select().from(productsTable).where(eq(productsTable.slug, slug)).limit(1);
  if (!product) notFound();

  const variants = await db.select().from(productVariants).where(eq(productVariants.productId, product.id));

  const tmplRows = await db
    .select()
    .from(customizationTemplates)
    .where(eq(customizationTemplates.productId, product.id))
    .limit(1);
  const layers = tmplRows[0]?.schema.layers ?? null;
  const productImage = getProductDetailImage(product);

  return (
    <div className="grid gap-10 md:grid-cols-2">
      <div className="space-y-4">
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-trap-sky-200 bg-white shadow-sm">
          {productImage ? (
            <Image src={productImage} alt="" fill className="object-cover" priority sizes="(max-width: 768px) 100vw, 50vw" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-trap-navy-900/50">No image</div>
          )}
        </div>
        <Link href="/products" className="text-sm font-medium text-trap-sky-700 hover:text-trap-sky-600">
          ← Back to shop
        </Link>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-trap-sky-600">
            {product.type === "jersey" ? "Jerseys" : "Footwear"}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-trap-navy-900">{product.name}</h1>
          <p className="text-trap-navy-900/80">{product.description}</p>
          <p className="text-lg font-semibold text-trap-sky-900">
            From {formatMoneyCents(product.basePriceCents)}
          </p>
        </div>

        <ProductAddForm
          productName={product.name}
          variantIds={variants.map((v) => ({ id: v.id, label: v.label }))}
          customizationLayers={layers}
          allowPersonalization={product.type === "jersey"}
        />

        <div className="rounded-xl border border-trap-sky-200 bg-white p-4 text-sm text-trap-navy-900/80">
          <p className="font-semibold text-trap-navy-900">Fit & authenticity</p>
          <p className="mt-2">
            TrapWear ships authentic retail-grade product. For footwear, use the size chart on this page’s variant
            selector as your primary guide.
          </p>
        </div>
      </div>
    </div>
  );
}
