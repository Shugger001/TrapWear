import { describe, expect, it } from "vitest";
import { lineTotalsAfterDiscount, percentDiscountCents } from "./discount";

describe("percentDiscountCents", () => {
  it("floors percentage", () => {
    expect(percentDiscountCents(999, 10)).toBe(99);
  });
});

describe("lineTotalsAfterDiscount", () => {
  it("preserves sum to target", () => {
    const lines = [5000, 3000, 2000];
    const d = 1000;
    const after = lineTotalsAfterDiscount(lines, d);
    expect(after.reduce((a, b) => a + b, 0)).toBe(10000 - d);
  });
});
