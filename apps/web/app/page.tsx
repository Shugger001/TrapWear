import Link from "next/link";
import { getStorefrontHeroBanner } from "@/lib/flags";

export default async function HomePage() {
  const banner = await getStorefrontHeroBanner();

  return (
    <div className="space-y-10">
      {banner ? (
        <div className="rounded-xl border border-trap-sky-200 bg-white px-4 py-3 text-center text-sm text-trap-navy-900 shadow-sm">
          Free name & number kit on jerseys this week — customize at checkout.
        </div>
      ) : null}

      <section className="grid gap-10 rounded-2xl bg-gradient-to-br from-white via-trap-sky-50 to-trap-sky-100 p-10 shadow-sm md:grid-cols-2 md:items-center">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-trap-sky-600">
            TrapWear
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-trap-navy-900 md:text-5xl">
            Jerseys engineered for the pitch. Footwear built for the city.
          </h1>
          <p className="text-lg text-trap-navy-900/80">
            Premium soccer kits with TrapWear personalization, plus a focused lineup of men’s footwear
            designed for everyday wear.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-lg bg-trap-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-trap-sky-500"
            >
              Shop the collection
            </Link>
            <Link
              href="/products#jerseys"
              className="inline-flex items-center justify-center rounded-lg border border-trap-sky-300 bg-white px-5 py-2.5 text-sm font-semibold text-trap-navy-900 hover:bg-trap-sky-50"
            >
              Explore jerseys
            </Link>
          </div>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-trap-sky-200 bg-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#bae6fd_0%,transparent_55%),radial-gradient(circle_at_80%_60%,#e0f2fe_0%,transparent_50%)]" />
          <div className="relative flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
            <span className="text-sm font-medium text-trap-sky-900">Velocity Pro</span>
            <span className="text-3xl font-semibold text-trap-navy-900">Home kit</span>
            <span className="text-sm text-trap-navy-900/70">Moisture-wicking · Custom name & number</span>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {[
          {
            title: "Guided customization",
            body: "Layered options with live pricing — validated on the server before you pay.",
          },
          {
            title: "Operations-ready",
            body: "Orders, inventory, and audit trails wired for a serious retail team.",
          },
          {
            title: "Performance-first",
            body: "Lean storefront routes with server-side totals and Stripe Checkout.",
          },
        ].map((c) => (
          <div key={c.title} className="rounded-xl border border-trap-sky-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-trap-navy-900">{c.title}</h2>
            <p className="mt-2 text-sm text-trap-navy-900/75">{c.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
