import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { customizationTemplates, productVariants, products as productsTable } from "@trapwear/db";
import { ProductAddForm } from "@/components/product-add-form";
import { db } from "@/lib/db";

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

  return (
    <div className="grid gap-10 md:grid-cols-2">
      <div className="space-y-4">
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-trap-sky-200 bg-white shadow-sm">
          {product.images[0] ? (
            <Image src={product.images[0]} alt="" fill className="object-cover" priority sizes="(max-width: 768px) 100vw, 50vw" />
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
            From ${(product.basePriceCents / 100).toFixed(2)}
          </p>
        </div>

        <ProductAddForm
          productName={product.name}
          variantIds={variants.map((v) => ({ id: v.id, label: v.label }))}
          customizationLayers={layers}
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
