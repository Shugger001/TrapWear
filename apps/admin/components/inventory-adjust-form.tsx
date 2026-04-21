"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function InventoryAdjustForm(props: { variantId: string; sku: string }) {
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

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
      <input
        type="text"
        inputMode="numeric"
        placeholder="+/- qty"
        className="w-20 rounded border border-trap-sky-200 px-2 py-1 text-xs"
        value={delta}
        onChange={(e) => setDelta(e.target.value)}
      />
      <input
        type="text"
        placeholder="Reason"
        className="min-w-[140px] flex-1 rounded border border-trap-sky-200 px-2 py-1 text-xs"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-trap-sky-600 px-2 py-1 text-xs font-semibold text-white hover:bg-trap-sky-500 disabled:opacity-60"
      >
        {pending ? "…" : "Apply"}
      </button>
      {error ? <span className="w-full text-xs text-red-700">{error}</span> : null}
    </form>
  );
}
