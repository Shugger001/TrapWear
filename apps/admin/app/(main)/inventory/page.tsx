import Link from "next/link";
import { Suspense } from "react";
import { asc, eq } from "drizzle-orm";
import { productVariants, products } from "@trapwear/db";
import { InventoryAdjustForm } from "@/components/inventory-adjust-form";
import { InventoryScrollToVariant } from "@/components/inventory-scroll-to-variant";
import { db } from "@/lib/db";

export default async function InventoryPage() {
  const rows = await db
    .select({
      variant: productVariants,
      product: products,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .orderBy(asc(products.name), asc(productVariants.sku));

  return (
    <div className="space-y-6 px-4 py-6 text-slate-100 sm:px-6 sm:py-8">
      <Suspense fallback={null}>
        <InventoryScrollToVariant />
      </Suspense>
      <header className="space-y-1">
        <Link href="/dashboard" className="text-xs font-medium text-indigo-300 hover:text-indigo-200 hover:underline">
          ← Overview
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Inventory</h1>
        <p className="text-sm text-slate-400">
          Adjust on-hand stock by SKU. Every change is audited with your admin user.
        </p>
      </header>

      <div className="md:hidden space-y-3">
        {rows.map(({ variant, product }) => (
          <div
            key={variant.id}
            id={`inv-row-${variant.id}`}
            className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg shadow-black/20"
          >
            <p className="font-medium text-white">{product.name}</p>
            <p className="mt-1 font-mono text-xs text-indigo-200">{variant.sku}</p>
            <p className="mt-1 text-sm text-slate-400">Variant: {variant.label}</p>
            <p className="mt-2 text-sm">
              <span className="text-slate-500">On hand</span>{" "}
              <span className="font-semibold tabular-nums text-white">{variant.stock}</span>
            </p>
            <div className="mt-4 border-t border-slate-800 pt-4">
              <InventoryAdjustForm variantId={variant.id} sku={variant.sku} variant="dark" />
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-slate-800/90 bg-slate-900/70 shadow-xl shadow-black/25 md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-800 bg-slate-900/90 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Variant</th>
              <th className="px-4 py-3">On hand</th>
              <th className="px-4 py-3">Adjust</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map(({ variant, product }) => (
              <tr key={variant.id} id={`inv-row-${variant.id}`} className="text-slate-200">
                <td className="px-4 py-3 font-medium text-white">{product.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-indigo-200">{variant.sku}</td>
                <td className="px-4 py-3 text-slate-300">{variant.label}</td>
                <td className="px-4 py-3 tabular-nums text-white">{variant.stock}</td>
                <td className="px-4 py-3">
                  <InventoryAdjustForm variantId={variant.id} sku={variant.sku} variant="dark" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
