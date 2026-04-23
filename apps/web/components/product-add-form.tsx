"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { formatMoneyCents } from "@/lib/money";

type Layer = { id: string; label: string; surchargeCents: number };

export function ProductAddForm(props: {
  variantIds: { id: string; label: string }[];
  customizationLayers: Layer[] | null;
  productName: string;
  allowPersonalization?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [variantId, setVariantId] = useState(props.variantIds[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [customName, setCustomName] = useState("");
  const [customNumber, setCustomNumber] = useState("");

  const surcharge = useMemo(() => {
    if (!props.customizationLayers) return 0;
    let cents = 0;
    for (const layer of props.customizationLayers) {
      if (selected[layer.id]) cents += layer.surchargeCents;
    }
    return cents;
  }, [props.customizationLayers, selected]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!variantId) return;

    const selectedLayers = props.customizationLayers?.filter((l) => selected[l.id]).map((l) => l.id) ?? [];
    const personalization =
      props.allowPersonalization && (customName.trim() || customNumber.trim())
        ? {
            customName: customName.trim() || undefined,
            customNumber: customNumber.trim() || undefined,
          }
        : {};

    startTransition(async () => {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          variantId,
          quantity: qty,
          customization: {
            ...(selectedLayers.length > 0 ? { selectedLayers } : {}),
            ...personalization,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Could not add to cart");
        return;
      }
      router.push("/cart");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium text-trap-navy-900" htmlFor="variant">
          Variant
        </label>
        <select
          id="variant"
          className="w-full rounded-lg border border-trap-sky-200 bg-white px-3 py-2 text-sm"
          value={variantId}
          onChange={(e) => setVariantId(e.target.value)}
        >
          {props.variantIds.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-trap-navy-900" htmlFor="qty">
          Quantity
        </label>
        <input
          id="qty"
          type="number"
          min={1}
          max={20}
          className="w-28 rounded-lg border border-trap-sky-200 bg-white px-3 py-2 text-sm"
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
        />
      </div>

      {props.customizationLayers && props.customizationLayers.length > 0 ? (
        <div className="space-y-3 rounded-xl border border-trap-sky-200 bg-white p-4">
          <p className="text-sm font-semibold text-trap-navy-900">Customization</p>
          <p className="text-xs text-trap-navy-900/70">
            Pricing is validated again at checkout — this preview helps you decide.
          </p>
          <div className="space-y-2">
            {props.customizationLayers.map((layer) => (
              <label key={layer.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(selected[layer.id])}
                    onChange={(e) =>
                      setSelected((s) => ({ ...s, [layer.id]: e.target.checked }))
                    }
                  />
                  {layer.label}
                </span>
                <span className="text-trap-navy-900/70">+{formatMoneyCents(layer.surchargeCents)}</span>
              </label>
            ))}
          </div>
          {surcharge > 0 ? (
            <p className="text-xs text-trap-sky-800">
              Customization add-on: <span className="font-semibold">{formatMoneyCents(surcharge)}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      {props.allowPersonalization ? (
        <div className="space-y-3 rounded-xl border border-trap-sky-200 bg-white p-4">
          <p className="text-sm font-semibold text-trap-navy-900">Personalization</p>
          <p className="text-xs text-trap-navy-900/70">
            Optional for jerseys: add player name and shirt number.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="rounded-lg border border-trap-sky-200 px-3 py-2 text-sm"
              placeholder="Name on jersey"
              maxLength={20}
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
            />
            <input
              className="rounded-lg border border-trap-sky-200 px-3 py-2 text-sm"
              placeholder="Number"
              inputMode="numeric"
              maxLength={2}
              value={customNumber}
              onChange={(e) => setCustomNumber(e.target.value.replace(/[^0-9]/g, ""))}
            />
          </div>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending || !variantId}
        className="inline-flex w-full items-center justify-center rounded-lg bg-trap-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-trap-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Adding…" : `Add to cart — ${props.productName}`}
      </button>
    </form>
  );
}
