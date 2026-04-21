export type LayerSchema = {
  layers: { id: string; label: string; surchargeCents: number }[];
};

export function customizationSurchargeCents(
  schema: LayerSchema,
  customization: Record<string, unknown>,
): { ok: true; cents: number } | { ok: false; error: string } {
  let cents = 0;
  const selected = customization.selectedLayers;
  if (selected == null) return { ok: true, cents: 0 };
  if (!Array.isArray(selected)) {
    return { ok: false, error: "Invalid customization payload." };
  }
  const allowed = new Set(schema.layers.map((l) => l.id));
  const seen = new Set<string>();
  for (const id of selected) {
    if (typeof id !== "string" || !allowed.has(id)) {
      return { ok: false, error: "Unknown customization option." };
    }
    if (seen.has(id)) {
      return { ok: false, error: "Duplicate customization option." };
    }
    seen.add(id);
    const layer = schema.layers.find((l) => l.id === id);
    if (layer) cents += layer.surchargeCents;
  }
  return { ok: true, cents };
}

export function lineUnitPriceCents(input: {
  basePriceCents: number;
  priceModifierCents: number;
  customizationSchema: LayerSchema | null;
  customization: Record<string, unknown>;
}): { ok: true; unitPriceCents: number } | { ok: false; error: string } {
  const sur = input.customizationSchema
    ? customizationSurchargeCents(input.customizationSchema, input.customization)
    : { ok: true as const, cents: 0 };
  if (!sur.ok) return sur;
  return {
    ok: true,
    unitPriceCents: input.basePriceCents + input.priceModifierCents + sur.cents,
  };
}
