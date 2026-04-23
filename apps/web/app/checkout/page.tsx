import Link from "next/link";
import { CheckoutForm } from "@/components/checkout-form";
import { cartTotals } from "@/lib/cart";
import { getCartIdFromCookie } from "@/lib/cart-cookie";
import { getCustomerFromSession } from "@/lib/customer-session";
import { formatMoneyCents } from "@/lib/money";
import { isPaystackConfigured } from "@/lib/paystack";

export default async function CheckoutPage(props: {
  searchParams: Promise<{ coupon?: string }>;
}) {
  const searchParams = await props.searchParams;
  const paystackReady = isPaystackConfigured();
  const cartId = await getCartIdFromCookie();
  const customer = await getCustomerFromSession();
  const totals = cartId
    ? await cartTotals(cartId)
    : { lines: [], subtotalCents: 0, shippingCents: 0, taxCents: 0, totalCents: 0 };

  if (!cartId || totals.lines.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight text-trap-navy-900">Checkout</h1>
        <p className="text-trap-navy-900/75">Your cart is empty.</p>
        <Link
          href="/products"
          className="inline-flex items-center justify-center rounded-lg bg-trap-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-trap-sky-500"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 md:grid-cols-3">
      <div className="md:col-span-2">
        <h1 className="mb-4 text-3xl font-semibold tracking-tight text-trap-navy-900">Checkout</h1>
        <CheckoutForm
          paystackReady={paystackReady}
          defaultEmail={customer?.email ?? ""}
          couponCode={searchParams.coupon}
        />
      </div>
      <div className="space-y-4 rounded-2xl border border-trap-sky-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-trap-navy-900">Order summary</p>
        <div className="space-y-2 text-sm text-trap-navy-900/80">
          <div className="flex justify-between">
            <span>Items</span>
            <span>{totals.lines.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatMoneyCents(totals.subtotalCents)}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>{formatMoneyCents(totals.shippingCents)}</span>
          </div>
          <div className="flex justify-between">
            <span>Est. tax</span>
            <span>{formatMoneyCents(totals.taxCents)}</span>
          </div>
          <div className="flex justify-between border-t border-trap-sky-200 pt-3 text-base font-semibold text-trap-navy-900">
            <span>Total</span>
            <span>{formatMoneyCents(totals.totalCents)}</span>
          </div>
        </div>
        <Link href="/cart" className="block text-center text-sm font-medium text-trap-sky-800 hover:text-trap-sky-700">
          ← Back to cart
        </Link>
      </div>
    </div>
  );
}
