/** Cart merchandise subtotal is pre-discount; tax applies to post-discount merchandise. */
export function orderTotalsFromSubtotal(subtotalCents: number, discountCents: number) {
  const d = Math.min(discountCents, subtotalCents);
  const after = subtotalCents - d;
  const shippingCents = after > 0 ? 599 : 0;
  const taxCents = Math.round(after * 0.08);
  return {
    discountCents: d,
    subtotalAfterDiscountCents: after,
    shippingCents,
    taxCents,
    totalCents: after + shippingCents + taxCents,
  };
}
