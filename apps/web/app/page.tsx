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

      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-trap-sky-50 to-trap-sky-100 p-10 shadow-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27320%27 height=%27320%27 viewBox=%270 0 320 320%27%3E%3Crect width=%27320%27 height=%27320%27 fill=%27none%27/%3E%3Cg fill=%27none%27 stroke=%27%230284c7%27 stroke-opacity=%270.25%27 stroke-width=%276%27%3E%3Cpath d=%27M56 84l38-22 30 18v36l-26 18H74l-18-20z%27/%3E%3Cpath d=%27M232 196c18-26 46-30 60-16 8 8 8 24-6 40-14 16-36 26-62 20l-16 18-16-8 14-18c-4-14 6-24 26-36z%27/%3E%3C/g%3E%3C/svg%3E")',
            backgroundSize: "260px 260px",
            backgroundPosition: "center",
          }}
        />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-trap-sky-600">TrapWear</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-trap-navy-900 md:text-5xl">
            Choose a category
          </h1>
          <p className="mt-3 max-w-3xl text-lg text-trap-navy-900/80">
            Start from one of the two product categories below.
          </p>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        {[
          {
            title: "Jerseys",
            body: "Soccer kits with TrapWear customization and match-ready materials.",
            href: "/products#jerseys",
            cta: "Go to Jerseys",
          },
          {
            title: "Footwear",
            body: "Lifestyle and performance footwear with brand search in one place.",
            href: "/products#footwear",
            cta: "Go to Footwear",
          },
        ].map((category) => (
          <div key={category.title} className="rounded-2xl border border-trap-sky-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-trap-navy-900">{category.title}</h2>
            <p className="mt-2 text-sm text-trap-navy-900/75">{category.body}</p>
            <Link
              href={category.href}
              className="mt-5 inline-flex items-center justify-center rounded-lg bg-trap-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-trap-sky-500"
            >
              {category.cta}
            </Link>
          </div>
        ))}
      </section>
    </div>
  );
}
