"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { MouseEvent } from "react";

export function QuickAddButton(props: { variantId: string; label?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onAdd(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      setError(null);
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          variantId: props.variantId,
          quantity: 1,
          customization: {},
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not add to cart");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={onAdd}
        disabled={pending}
        className="inline-flex items-center justify-center rounded-lg bg-trap-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-trap-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Adding..." : props.label ?? "Add to cart"}
      </button>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
