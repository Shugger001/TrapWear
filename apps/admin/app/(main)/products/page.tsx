import Link from "next/link";
import { asc } from "drizzle-orm";
import { productVariants, products } from "@trapwear/db";
import { ProductsManager } from "@/components/products-manager";
import { db } from "@/lib/db";

export default async function AdminProductsPage() {
  const productRows = await db.select().from(products).orderBy(asc(products.type), asc(products.name));
  const variantRows = await db.select().from(productVariants).orderBy(asc(productVariants.sku));

  const variantsByProduct = new Map<string, typeof variantRows>();
  for (const variant of variantRows) {
    const group = variantsByProduct.get(variant.productId) ?? [];
    group.push(variant);
    variantsByProduct.set(variant.productId, group);
  }

  const productsForClient = productRows.map((product) => {
    const variants = variantsByProduct.get(product.id) ?? [];
    return {
      ...product,
      variants: variants.map((v) => ({
        id: v.id,
        productId: v.productId,
        sku: v.sku,
        label: v.label,
        priceModifierCents: v.priceModifierCents,
        stock: v.stock,
        options: (v.options ?? {}) as Record<string, string>,
      })),
      variantsCount: variants.length,
      totalStock: variants.reduce((sum, v) => sum + v.stock, 0),
    };
  });

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <header className="mb-6 rounded-2xl border border-slate-800/90 bg-slate-900/70 p-6 shadow-xl shadow-black/25">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-300/90">Catalog</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">Products</h1>
        <p className="mt-2 text-sm text-slate-400">
          Manage storefront products: create, edit, delete, and review stock coverage.
        </p>
        <p className="mt-3 text-xs text-slate-500">
          Tip: Variant stock is adjusted from <Link href="/inventory" className="text-indigo-300 hover:underline">Inventory</Link>.
        </p>
      </header>
      <ProductsManager
        initialProducts={productsForClient}
        siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? "https://trap-wear-web.vercel.app"}
      />
    </div>
  );
}
