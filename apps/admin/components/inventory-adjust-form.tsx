"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function InventoryAdjustForm(props: {
  variantId: string;
  sku: string;
  /** Dark fields for slate admin panels */
  variant?: "light" | "dark";
}) {
  const dark = props.variant === "dark";
  const router = useRouter();
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const d = Number.parseInt(delta, 10);
    if (Number.isNaN(d) || d === 0) {
      setError("Enter a non-zero whole number (positive to add, negative to remove).");
      setPending(false);
      return;
    }
    if (!reason.trim()) {
      setError("Reason is required.");
      setPending(false);
      return;
    }
    const res = await fetch("/api/inventory/adjust", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        variantId: props.variantId,
        delta: d,
        reason: reason.trim(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Adjust failed");
      setPending(false);
      return;
    }
    setDelta("");
    setReason("");
    router.refresh();
    setPending(false);
  }

  const field =
    dark
      ? "rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500"
      : "rounded border border-trap-sky-200 px-2 py-1 text-xs";
  const btn =
    dark
      ? "rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
      : "rounded bg-trap-sky-600 px-2 py-1 text-xs font-semibold text-white hover:bg-trap-sky-500 disabled:opacity-60";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
      <input
        type="text"
        inputMode="numeric"
        placeholder="+/- qty"
        className={dark ? `${field} w-full sm:w-24` : `${field} w-20`}
        value={delta}
        onChange={(e) => setDelta(e.target.value)}
      />
      <input
        type="text"
        placeholder="Reason"
        className={dark ? `${field} min-h-11 w-full flex-1` : "min-w-[140px] flex-1 rounded border border-trap-sky-200 px-2 py-1 text-xs"}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <button type="submit" disabled={pending} className={dark ? `${btn} w-full sm:w-auto` : btn}>
        {pending ? "…" : "Apply"}
      </button>
      {error ? (
        <span className={`w-full text-xs ${dark ? "text-red-400" : "text-red-700"}`}>{error}</span>
      ) : null}
    </form>
  );
}
