import Link from "next/link";
import type { ReactNode } from "react";
import { completePaystackReturn } from "@/lib/paystack-order";

export default async function CheckoutSuccessPage(props: {
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}) {
  const sp = await props.searchParams;
  const reference = sp.reference ?? sp.trxref;

  let detail: ReactNode = null;
  if (reference) {
    const r = await completePaystackReturn(reference);
    if (r.status === "failed") {
      detail = (
        <p className="text-sm text-red-700">
          We couldn’t confirm this payment{r.detail ? ` (${r.detail})` : ""}. If you were charged, contact support with
          your reference: <span className="font-mono">{reference}</span>
        </p>
      );
    } else if (r.status === "unverified") {
      detail = (
        <p className="text-sm text-trap-navy-900/80">
          We couldn’t verify the transaction yet. If your order doesn’t show as paid in a few minutes, contact support.
        </p>
      );
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 text-center">
      <h1 className="text-3xl font-semibold text-trap-navy-900">Payment received</h1>
      <p className="text-trap-navy-900/80">
        Thanks for shopping TrapWear. Your order is marked <span className="font-semibold">paid</span> once Paystack
        confirms the charge
        {reference ? ` (reference ${reference})` : ""}.
      </p>
      {detail}
      <Link
        href="/products"
        className="inline-flex items-center justify-center rounded-lg bg-trap-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-trap-sky-500"
      >
        Keep shopping
      </Link>
    </div>
  );
}
