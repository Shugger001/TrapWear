"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CouponCreateForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [percentOff, setPercentOff] = useState(10);
  const [minSubtotalDollars, setMinSubtotalDollars] = useState("50");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const min = Number.parseFloat(minSubtotalDollars);
    if (Number.isNaN(min) || min < 0) {
      setError("Minimum subtotal must be a non-negative number.");
      setPending(false);
      return;
    }

    const minSubtotalCents = Math.round(min * 100);
    let maxR: number | null = null;
    if (maxRedemptions.trim() !== "") {
      const n = Number.parseInt(maxRedemptions, 10);
      if (Number.isNaN(n) || n < 1) {
        setError("Max redemptions must be a positive integer or left blank for unlimited.");
        setPending(false);
        return;
      }
      maxR = n;
    }

    const body: {
      code: string;
      percentOff: number;
      minSubtotalCents: number;
      expiresAt: string | null;
      maxRedemptions: number | null;
    } = {
      code,
      percentOff,
      minSubtotalCents,
      expiresAt: null,
      maxRedemptions: maxR,
    };
    if (expiresAt.trim() !== "") {
      body.expiresAt = new Date(`${expiresAt}T23:59:59.999Z`).toISOString();
    }

    const res = await fetch("/api/super/coupons", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not create coupon");
      setPending(false);
      return;
    }

    setCode("");
    setExpiresAt("");
    setMaxRedemptions("");
    router.refresh();
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-trap-navy-900" htmlFor="code">
            Code
          </label>
          <input
            id="code"
            required
            className="w-full rounded-lg border border-trap-sky-200 px-3 py-2 text-sm uppercase"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="SUMMER25"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-trap-navy-900" htmlFor="pct">
            Percent off
          </label>
          <input
            id="pct"
            type="number"
            min={1}
            max={100}
            required
            className="w-full rounded-lg border border-trap-sky-200 px-3 py-2 text-sm"
            value={percentOff}
            onChange={(e) => setPercentOff(Number(e.target.value))}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-trap-navy-900" htmlFor="min">
            Min. cart subtotal (USD)
          </label>
          <input
            id="min"
            type="text"
            required
            className="w-full rounded-lg border border-trap-sky-200 px-3 py-2 text-sm"
            value={minSubtotalDollars}
            onChange={(e) => setMinSubtotalDollars(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-trap-navy-900" htmlFor="exp">
            Expires (optional)
          </label>
          <input
            id="exp"
            type="date"
            className="w-full rounded-lg border border-trap-sky-200 px-3 py-2 text-sm"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="text-sm font-medium text-trap-navy-900" htmlFor="maxr">
            Max redemptions (optional)
          </label>
          <input
            id="maxr"
            type="text"
            inputMode="numeric"
            className="w-full max-w-xs rounded-lg border border-trap-sky-200 px-3 py-2 text-sm"
            value={maxRedemptions}
            onChange={(e) => setMaxRedemptions(e.target.value)}
            placeholder="Unlimited if empty"
          />
          <p className="text-xs text-trap-navy-900/60">
            Counts successful Paystack payments that used this code. Leave blank for no cap.
          </p>
        </div>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-trap-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-trap-sky-500 disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create coupon"}
      </button>
    </form>
  );
}
