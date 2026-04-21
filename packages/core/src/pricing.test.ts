import { describe, expect, it } from "vitest";
import { customizationSurchargeCents, lineUnitPriceCents } from "./pricing";

describe("customizationSurchargeCents", () => {
  const schema = {
    layers: [
      { id: "nameset", label: "Name & number", surchargeCents: 1500 },
      { id: "patch", label: "League patch", surchargeCents: 800 },
    ],
  };

  it("returns 0 when nothing selected", () => {
    expect(customizationSurchargeCents(schema, {})).toEqual({ ok: true, cents: 0 });
  });

  it("sums selected layers", () => {
    expect(
      customizationSurchargeCents(schema, { selectedLayers: ["nameset", "patch"] }),
    ).toEqual({ ok: true, cents: 2300 });
  });

  it("rejects unknown layer", () => {
    const r = customizationSurchargeCents(schema, { selectedLayers: ["x"] });
    expect(r.ok).toBe(false);
  });
});

describe("lineUnitPriceCents", () => {
  it("computes jersey line total", () => {
    const schema = {
      layers: [{ id: "nameset", label: "Name & number", surchargeCents: 1500 }],
    };
    const r = lineUnitPriceCents({
      basePriceCents: 8900,
      priceModifierCents: 500,
      customizationSchema: schema,
      customization: { selectedLayers: ["nameset"] },
    });
    expect(r).toEqual({ ok: true, unitPriceCents: 10900 });
  });
});
