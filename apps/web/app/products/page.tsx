import Image from "next/image";
import Link from "next/link";
import { products as productsTable } from "@trapwear/db";
import { db } from "@/lib/db";

export default async function ProductsPage() {
  const rows = await db.select().from(productsTable);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-trap-navy-900">Shop</h1>
        <p className="mt-2 max-w-2xl text-trap-navy-900/75">
          Jerseys with TrapWear personalization and men’s footwear curated for everyday rotation.
        </p>
      </div>

      <div id="jerseys" className="grid gap-6 md:grid-cols-2">
        {rows.map((p) => (
          <Link
            key={p.id}
            href={`/products/${p.slug}`}
            className="group overflow-hidden rounded-2xl border border-trap-sky-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="relative aspect-[16/10] bg-trap-sky-50">
              {p.images[0] ? (
                <Image
                  src={p.images[0]}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : null}
              <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-trap-navy-900 shadow-sm">
                {p.type === "jersey" ? "Jerseys" : "Footwear"}
              </div>
            </div>
            <div className="space-y-2 p-5">
              <h2 className="text-lg font-semibold text-trap-navy-900 group-hover:text-trap-sky-700">
                {p.name}
              </h2>
              <p className="line-clamp-2 text-sm text-trap-navy-900/70">{p.description}</p>
              <p className="text-sm font-semibold text-trap-sky-800">
                From ${(p.basePriceCents / 100).toFixed(2)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
