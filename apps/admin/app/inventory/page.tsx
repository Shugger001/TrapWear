import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { productVariants, products } from "@trapwear/db";
import { InventoryAdjustForm } from "@/components/inventory-adjust-form";
import { LogoutButton } from "@/components/logout-button";
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
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-sm font-medium text-trap-sky-700 hover:text-trap-sky-600">
            ← Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-trap-navy-900">Inventory</h1>
          <p className="text-sm text-trap-navy-900/70">
            Adjust on-hand stock by SKU. Every change is audited with your admin user.
          </p>
        </div>
        <LogoutButton />
      </header>

      <div className="overflow-x-auto rounded-2xl border border-trap-sky-100 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-trap-sky-100 text-xs uppercase text-trap-navy-900/50">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Variant</th>
              <th className="px-4 py-3">On hand</th>
              <th className="px-4 py-3">Adjust</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-trap-sky-100">
            {rows.map(({ variant, product }) => (
              <tr key={variant.id}>
                <td className="px-4 py-3 font-medium text-trap-navy-900">{product.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{variant.sku}</td>
                <td className="px-4 py-3">{variant.label}</td>
                <td className="px-4 py-3">{variant.stock}</td>
                <td className="px-4 py-3">
                  <InventoryAdjustForm variantId={variant.id} sku={variant.sku} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
