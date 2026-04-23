import Link from "next/link";
import { cartTotals } from "@/lib/cart";
import { getCartIdFromCookie } from "@/lib/cart-cookie";
import { CartClient } from "@/components/cart-client";
import { isPaystackConfigured } from "@/lib/paystack";

export default async function CartPage() {
  const paystackReady = isPaystackConfigured();
  const cartId = await getCartIdFromCookie();
  const totals = cartId
    ? await cartTotals(cartId)
    : {
        lines: [],
        subtotalCents: 0,
        shippingCents: 0,
        taxCents: 0,
        totalCents: 0,
      };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-trap-navy-900">Cart</h1>
        <p className="mt-2 text-trap-navy-900/75">Review items — totals are computed on the server.</p>
      </div>

      {!cartId || totals.lines.length === 0 ? (
        <div className="rounded-2xl border border-trap-sky-200 bg-white p-10 text-center shadow-sm">
          <p className="text-trap-navy-900/80">Your cart is empty.</p>
          <Link
            href="/products"
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-trap-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-trap-sky-500"
          >
            Browse products
          </Link>
        </div>
      ) : (
        <CartClient
          paystackReady={paystackReady}
          lines={totals.lines}
          subtotalCents={totals.subtotalCents}
          shippingCents={totals.shippingCents}
          taxCents={totals.taxCents}
          totalCents={totals.totalCents}
        />
      )}
    </div>
  );
}
