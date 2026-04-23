"use client";

import { useState, useTransition } from "react";

export function CheckoutForm(props: {
  paystackReady: boolean;
  defaultEmail?: string;
  couponCode?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState(props.defaultEmail ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("Nigeria");

  function submit() {
    if (!props.paystackReady) return;
    startTransition(async () => {
      setError(null);
      const emailTrimmed = email.trim();
      if (!emailTrimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
        setError("Enter a valid email address.");
        return;
      }
      if (!name.trim() || !phone.trim() || !addressLine1.trim() || !city.trim() || !country.trim()) {
        setError("Please fill all required shipping/contact fields.");
        return;
      }

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: emailTrimmed,
          name,
          phone,
          addressLine1,
          addressLine2: addressLine2.trim() || undefined,
          city,
          state: state.trim() || undefined,
          postalCode: postalCode.trim() || undefined,
          country,
          couponCode: props.couponCode?.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Checkout failed.");
        return;
      }
      if (data.url) window.location.href = data.url as string;
    });
  }

  const disabledFields = !props.paystackReady;

  return (
    <div className="space-y-4 rounded-2xl border border-trap-sky-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-trap-navy-900">Checkout details</h2>

      {!props.paystackReady ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">Online payment is not available yet</p>
          <p className="mt-1 text-amber-950/85">
            Set <code className="rounded bg-amber-100/80 px-1 font-mono text-xs">PAYSTACK_SECRET_KEY</code> and{" "}
            <code className="rounded bg-amber-100/80 px-1 font-mono text-xs">PAYSTACK_CURRENCY</code> in your environment
            (e.g. Vercel project settings), then redeploy. You can still browse the store and manage your cart.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <input
          disabled={disabledFields}
          className="rounded-lg border border-trap-sky-200 px-3 py-2 text-sm disabled:bg-trap-sky-50 disabled:text-trap-navy-900/50"
          placeholder="Full name*"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          disabled={disabledFields}
          className="rounded-lg border border-trap-sky-200 px-3 py-2 text-sm disabled:bg-trap-sky-50 disabled:text-trap-navy-900/50"
          placeholder="Email*"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          disabled={disabledFields}
          className="rounded-lg border border-trap-sky-200 px-3 py-2 text-sm disabled:bg-trap-sky-50 disabled:text-trap-navy-900/50"
          placeholder="Phone*"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <input
          disabled={disabledFields}
          className="rounded-lg border border-trap-sky-200 px-3 py-2 text-sm disabled:bg-trap-sky-50 disabled:text-trap-navy-900/50"
          placeholder="Country*"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        />
      </div>
      <input
        disabled={disabledFields}
        className="w-full rounded-lg border border-trap-sky-200 px-3 py-2 text-sm disabled:bg-trap-sky-50 disabled:text-trap-navy-900/50"
        placeholder="Address line 1*"
        value={addressLine1}
        onChange={(e) => setAddressLine1(e.target.value)}
      />
      <input
        disabled={disabledFields}
        className="w-full rounded-lg border border-trap-sky-200 px-3 py-2 text-sm disabled:bg-trap-sky-50 disabled:text-trap-navy-900/50"
        placeholder="Address line 2 (optional)"
        value={addressLine2}
        onChange={(e) => setAddressLine2(e.target.value)}
      />
      <div className="grid gap-3 md:grid-cols-3">
        <input
          disabled={disabledFields}
          className="rounded-lg border border-trap-sky-200 px-3 py-2 text-sm disabled:bg-trap-sky-50 disabled:text-trap-navy-900/50"
          placeholder="City*"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <input
          disabled={disabledFields}
          className="rounded-lg border border-trap-sky-200 px-3 py-2 text-sm disabled:bg-trap-sky-50 disabled:text-trap-navy-900/50"
          placeholder="State/Region"
          value={state}
          onChange={(e) => setState(e.target.value)}
        />
        <input
          disabled={disabledFields}
          className="rounded-lg border border-trap-sky-200 px-3 py-2 text-sm disabled:bg-trap-sky-50 disabled:text-trap-navy-900/50"
          placeholder="Postal code"
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
        />
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <button
        type="button"
        onClick={submit}
        disabled={pending || disabledFields}
        className="inline-flex w-full items-center justify-center rounded-lg bg-trap-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-trap-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Redirecting..." : props.paystackReady ? "Continue to Paystack" : "Payment unavailable"}
      </button>
    </div>
  );
}
