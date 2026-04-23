import Image from "next/image";
import Link from "next/link";
import { productVariants as productVariantsTable, products as productsTable } from "@trapwear/db";
import { QuickAddButton } from "@/components/quick-add-button";
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

function inferFootwearBrand(name: string): string {
  const normalized = name.trim().toLowerCase();
  const matchedBrand = FOOTWEAR_BRANDS.find((brand) => normalized.startsWith(brand.toLowerCase()));
  if (matchedBrand) return matchedBrand;
  return name.trim().split(/\s+/)[0] ?? "";
}

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

function getFootwearFallbackImage(name: string): string {
  const normalized = name.toLowerCase();
  const hash = Array.from(normalized).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return FOOTWEAR_IMAGE_POOL[hash % FOOTWEAR_IMAGE_POOL.length]!;
}

function getCardImage(product: { type: "jersey" | "footwear"; name: string; images: string[] }): string | null {
  const primary = product.images[0] ?? null;
  if (product.type === "jersey") {
    if (!primary || primary.endsWith(".svg")) return getJerseyFallbackImage(product.name);
    return primary;
  }
  if (!primary) return getFootwearFallbackImage(product.name);

  // Replace seeded vector placeholders with real brand photos in footwear cards.
  if (primary.endsWith(".svg")) return getFootwearFallbackImage(product.name);
  return primary;
}

export default async function ProductsPage(props: {
  searchParams: Promise<{ brand?: string }>;
}) {
  const searchParams = await props.searchParams;
  const brandQuery = searchParams.brand?.trim().toLowerCase() ?? "";
  const rows = await db.select().from(productsTable);
  const variantRows = await db.select().from(productVariantsTable);
  const firstVariantByProduct = new Map<string, string>();
  for (const v of variantRows) {
    if (!firstVariantByProduct.has(v.productId)) {
      firstVariantByProduct.set(v.productId, v.id);
    }
  }
  const jerseys = rows.filter((p) => p.type === "jersey");
  const footwear = rows.filter((p) => p.type === "footwear");
  const footwearBrands = Array.from(
    new Set([...FOOTWEAR_BRANDS, ...footwear.map((p) => inferFootwearBrand(p.name))]),
  ).sort((a, b) => a.localeCompare(b));
  const filteredFootwear = brandQuery
    ? footwear.filter((p) => inferFootwearBrand(p.name).toLowerCase().includes(brandQuery))
    : footwear;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-trap-navy-900">Shop</h1>
        <p className="mt-2 max-w-2xl text-trap-navy-900/75">
          Browse jerseys and footwear in separate collections.
        </p>
      </div>

      <section
        id="jerseys"
        className="relative space-y-4 overflow-hidden rounded-2xl border border-trap-sky-200 p-4 md:p-5"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/jerseys/vintage-shop-bg.png')" }}
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-white/82 backdrop-blur-[1px]" />
        <div className="relative">
          <h2 className="text-2xl font-semibold tracking-tight text-trap-navy-900">Jerseys</h2>
          <p className="mt-1 text-sm text-trap-navy-900/75">
            TrapWear kits with personalization options.
          </p>
        </div>
        <div className="relative grid gap-6 md:grid-cols-2">
          {jerseys.map((p) => (
            (() => {
              const cardImage = getCardImage(p);
              return (
            <Link
              key={p.id}
              href={`/products/${p.slug}`}
              className="group overflow-hidden rounded-2xl border border-trap-sky-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative aspect-[16/10] bg-trap-sky-50">
                {cardImage ? (
                  <Image
                    src={cardImage}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                ) : null}
                <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-trap-navy-900 shadow-sm">
                  Jerseys
                </div>
              </div>
              <div className="space-y-2 p-5">
                <h3 className="text-lg font-semibold text-trap-navy-900 group-hover:text-trap-sky-700">
                  {p.name}
                </h3>
                <p className="line-clamp-2 text-sm text-trap-navy-900/70">{p.description}</p>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-trap-sky-800">
                    From {formatMoneyCents(p.basePriceCents)}
                  </p>
                  {firstVariantByProduct.get(p.id) ? (
                    <QuickAddButton variantId={firstVariantByProduct.get(p.id)!} />
                  ) : null}
                </div>
              </div>
            </Link>
              );
            })()
          ))}
        </div>
      </section>

      <section id="footwear" className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-trap-navy-900">Footwear</h2>
          <p className="mt-1 text-sm text-trap-navy-900/70">
            Everyday pairs built for comfort and city wear.
          </p>
        </div>
        <div className="rounded-xl border border-trap-sky-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <form action="/products#footwear" className="flex w-full max-w-md items-center gap-2">
              <input
                type="search"
                name="brand"
                defaultValue={searchParams.brand ?? ""}
                placeholder="Search footwear brand (e.g. Nike)"
                className="w-full rounded-lg border border-trap-sky-200 bg-white px-3 py-2 text-sm text-trap-navy-900 outline-none ring-trap-sky-300 placeholder:text-trap-navy-900/45 focus:ring-2"
              />
              <button
                type="submit"
                className="rounded-lg bg-trap-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-trap-sky-500"
              >
                Search
              </button>
            </form>
            <Link
              href="/products#footwear"
              className="text-sm font-medium text-trap-sky-700 hover:text-trap-sky-600"
            >
              Clear
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {footwearBrands.map((brand) => (
              <Link
                key={brand}
                href={`/products?brand=${encodeURIComponent(brand)}#footwear`}
                className="rounded-full border border-trap-sky-200 bg-trap-sky-50 px-3 py-1 text-xs font-semibold text-trap-navy-900 hover:border-trap-sky-400 hover:bg-white"
              >
                {brand}
              </Link>
            ))}
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {filteredFootwear.map((p) => (
            <Link
              key={p.id}
              href={`/products/${p.slug}`}
              className="group overflow-hidden rounded-2xl border border-trap-sky-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              {(() => {
                const brand = inferFootwearBrand(p.name);
                const cardImage = getCardImage(p);
                return (
              <div className="relative aspect-[16/10] bg-trap-sky-50">
                {cardImage ? (
                  <Image
                    src={cardImage}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                ) : null}
                <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-trap-navy-900 shadow-sm">
                  Footwear
                </div>
                <div className="absolute right-4 top-4 rounded-full bg-trap-navy-900/88 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-sm">
                  {brand}
                </div>
              </div>
                );
              })()}
              <div className="space-y-2 p-5">
                <h3 className="text-lg font-semibold text-trap-navy-900 group-hover:text-trap-sky-700">
                  {p.name}
                </h3>
                <p className="text-xs font-semibold uppercase tracking-wide text-trap-sky-700">
                  {inferFootwearBrand(p.name)}
                </p>
                <p className="line-clamp-2 text-sm text-trap-navy-900/70">{p.description}</p>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-trap-sky-800">
                    From {formatMoneyCents(p.basePriceCents)}
                  </p>
                  {firstVariantByProduct.get(p.id) ? (
                    <QuickAddButton variantId={firstVariantByProduct.get(p.id)!} />
                  ) : null}
                </div>
              </div>
            </Link>
          ))}
        </div>
        {filteredFootwear.length === 0 ? (
          <p className="rounded-lg border border-trap-sky-200 bg-white px-4 py-3 text-sm text-trap-navy-900/75">
            No footwear matched that brand search.
          </p>
        ) : null}
      </section>
    </div>
  );
}
