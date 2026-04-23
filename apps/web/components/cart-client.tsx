"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { CartLineView } from "@/lib/cart";
import { formatMoneyCents } from "@/lib/money";

type CouponPreview = {
  code: string;
  totals: {
    subtotalBeforeDiscountCents: number;
    discountCents: number;
    subtotalAfterDiscountCents: number;
    shippingCents: number;
    taxCents: number;
    totalCents: number;
  };
};

export function CartClient(props: {
  paystackReady?: boolean;
  lines: CartLineView[];
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
}) {
  const paystackReady = props.paystackReady ?? true;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [preview, setPreview] = useState<CouponPreview | null>(null);

  const display = preview?.totals ?? {
    subtotalBeforeDiscountCents: props.subtotalCents,
    discountCents: 0,
    subtotalAfterDiscountCents: props.subtotalCents,
    shippingCents: props.shippingCents,
    taxCents: props.taxCents,
    totalCents: props.totalCents,
  };

  async function removeLine(lineId: string) {
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/cart?lineId=${encodeURIComponent(lineId)}`, { method: "DELETE" });
      if (!res.ok) {
        setError("Could not remove item.");
        return;
      }
      setPreview(null);
      setCode("");
      router.refresh();
    });
  }

  async function applyCoupon() {
    setCouponError(null);
    const res = await fetch("/api/coupon/validate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setCouponError(data.error ?? "Invalid code");
      setPreview(null);
      return;
    }
    setPreview({
      code: data.coupon.code as string,
      totals: data.coupon.totals,
    });
  }

  return (
    <div className="grid gap-8 md:grid-cols-3">
      <div className="space-y-4 md:col-span-2">
        {props.lines.map((line) => (
          <div
            key={line.lineId}
            className="flex flex-col justify-between gap-4 rounded-2xl border border-trap-sky-200 bg-white p-5 shadow-sm md:flex-row md:items-center"
          >
            <div>
              <p className="font-semibold text-trap-navy-900">{line.productName}</p>
              <p className="text-sm text-trap-navy-900/70">Variant: {line.variantLabel}</p>
              <p className="text-sm text-trap-navy-900/70">Qty: {line.quantity}</p>
              {Array.isArray(line.customization.selectedLayers) && line.customization.selectedLayers.length > 0 ? (
                <p className="mt-2 text-xs text-trap-sky-800">
                  Add-ons: {(line.customization.selectedLayers as string[]).join(", ")}
                </p>
              ) : null}
              {typeof line.customization.customName === "string" && line.customization.customName ? (
                <p className="mt-1 text-xs text-trap-navy-900/70">
                  Name: {line.customization.customName}
                </p>
              ) : null}
              {typeof line.customization.customNumber === "string" && line.customization.customNumber ? (
                <p className="text-xs text-trap-navy-900/70">Number: {line.customization.customNumber}</p>
              ) : null}
            </div>
            <div className="flex items-end justify-between gap-6 md:flex-col md:items-end">
              <p className="text-sm font-semibold text-trap-navy-900">
                {formatMoneyCents(line.lineTotalCents)}
              </p>
              <button
                type="button"
                className="text-sm font-medium text-red-700 hover:text-red-600"
                disabled={pending}
                onClick={() => removeLine(line.lineId)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4 rounded-2xl border border-trap-sky-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-trap-navy-900">Promo code</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="flex-1 rounded-lg border border-trap-sky-200 px-3 py-2 text-sm uppercase"
            placeholder="WELCOME10"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button
            type="button"
            className="rounded-lg bg-trap-sky-100 px-4 py-2 text-sm font-semibold text-trap-navy-900 hover:bg-trap-sky-200"
            onClick={applyCoupon}
          >
            Apply
          </button>
        </div>
        {couponError ? <p className="text-xs text-red-700">{couponError}</p> : null}
        {preview ? (
          <p className="text-xs text-trap-sky-800">
            Applied <span className="font-semibold">{preview.code}</span> ·{" "}
            <button
              type="button"
              className="font-medium text-trap-sky-700 underline"
              onClick={() => {
                setPreview(null);
                setCode("");
              }}
            >
              Remove
            </button>
          </p>
        ) : (
          <p className="text-xs text-trap-navy-900/60">Try seeded code WELCOME10 (min. GH₵50 cart before discount).</p>
        )}

        <p className="text-sm font-semibold text-trap-navy-900">Summary</p>
        <div className="space-y-2 text-sm text-trap-navy-900/80">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatMoneyCents(display.subtotalBeforeDiscountCents)}</span>
          </div>
          {display.discountCents > 0 ? (
            <div className="flex justify-between text-trap-sky-800">
              <span>Discount</span>
              <span>−{formatMoneyCents(display.discountCents)}</span>
            </div>
          ) : null}
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>{formatMoneyCents(display.shippingCents)}</span>
          </div>
          <div className="flex justify-between">
            <span>Est. tax</span>
            <span>{formatMoneyCents(display.taxCents)}</span>
          </div>
          <div className="flex justify-between border-t border-trap-sky-200 pt-3 text-base font-semibold text-trap-navy-900">
            <span>Total</span>
            <span>{formatMoneyCents(display.totalCents)}</span>
          </div>
        </div>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        {paystackReady ? (
          <Link
            href={preview?.code ? `/checkout?coupon=${encodeURIComponent(preview.code)}` : "/checkout"}
            className="inline-flex w-full items-center justify-center rounded-lg bg-trap-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-trap-sky-500"
          >
            Proceed to checkout
          </Link>
        ) : (
          <span
            className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-lg border border-trap-sky-200 bg-trap-sky-50 px-5 py-2.5 text-sm font-semibold text-trap-navy-900/50"
            title="Add PAYSTACK_SECRET_KEY to enable checkout"
          >
            Checkout unavailable
          </span>
        )}
        <p className="text-xs text-trap-navy-900/60">
          {paystackReady
            ? "Enter shipping/contact details on the checkout page, then continue to Paystack."
            : "Checkout opens once Paystack keys are configured in the environment."}
        </p>

        <Link href="/products" className="block text-center text-sm font-medium text-trap-sky-800 hover:text-trap-sky-700">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
